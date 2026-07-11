# Known Issue: Windows-specific backend test teardown failures (BackgroundTasks + asyncpg)

**Status:** RESOLVED (see [Resolution](#resolution-eng-1) below) — 231/231 backend tests
now pass deterministically, verified across 13 consecutive full-suite runs (5 in default
file order, 8 with randomized file order) on this same Windows machine.
**Affects (historical):** Local backend test runs on Windows only (unconfirmed on Linux/CI
at the time this doc was first written).
**Tracking:** No GitHub issue tracker configured for this repository at time of writing (`gh` CLI unavailable in this environment) — tracked here until one exists.

## Summary

8 of the 231 backend tests fail consistently on this Windows development machine with
asyncio/asyncpg event-loop teardown errors. All 223 other backend tests, and all 80
frontend tests, pass cleanly. None of the 8 failures touch Replay (Sprint 6) or Health
(Sprint 7) code or tests.

## Affected tests

- `tests/test_analysis_router.py::test_get_analysis_200_with_analyses_after_dispatch`
- `tests/test_analysis_router.py::test_get_analysis_response_has_expected_analyzer_names`
- `tests/test_analysis_router.py::test_language_analyzer_findings_for_python_file`
- `tests/test_analysis_router.py::test_git_context_analyzer_classifies_feature_branch`
- `tests/test_analysis_router.py::test_file_metadata_analyzer_detects_test_file`
- `tests/test_events_router.py::test_ingest_duplicate_event_returns_200_with_same_id`
- `tests/test_websocket.py::test_websocket_receives_broadcast_on_new_event`
- `tests/test_websocket_sessions.py::test_websocket_receives_session_updated_on_second_event`

## Reproduction

```bash
cd apps/api
uv run pytest tests/ -v
```

Requires a reachable Postgres instance matching `DATABASE_URL` (the Docker Compose
instance on `localhost:5433` by default — see `.env.example`). Reproduced consistently
across multiple runs, with and without a `WindowsSelectorEventLoopPolicy` override (see
below), with byte-identical failure set and error signatures each time.

## Root cause

Two failure signatures appear, both originating from the same underlying issue:

1. `AttributeError: 'NoneType' object has no attribute 'send'` in
   `asyncio/proactor_events.py`, during a socket write.
2. `RuntimeError: Event loop is closed`, raised from
   `sqlalchemy.dialects.postgresql.asyncpg.do_terminate()` while trying to gracefully
   close an asyncpg connection, followed by an unretrieved
   `asyncpg.exceptions._base.InternalClientError('got result for unknown protocol state 3')`
   future exception during test-session teardown.

The actual trigger is **not** the Windows `ProactorEventLoop` implementation itself —
forcing `asyncio.WindowsSelectorEventLoopPolicy()` in `conftest.py` was tried as a
diagnostic fix and produced the identical 8 failures with identical signatures, so that
hypothesis is disproved.

The real cause is a teardown-ordering issue combined with two pre-existing test-design
patterns, both predating Sprint 6/7 by several sprints:

- `POST /events` dispatches `analysis_service.dispatch(...)` via FastAPI's
  `BackgroundTasks` (`app/features/events/router.py:61`). This coroutine runs _after_
  the test's `await client.post(...)` call returns, and the test never awaits its
  completion. When the session-scoped event loop / engine begins tearing down before
  that background coroutine's asyncpg connection has finished closing, the connection
  close operation raises against an already-closed or already-reassigned loop. This
  explains the 5 `test_analysis_router.py` failures (each calls `dispatch()` directly
  on top of the router's own background dispatch) and
  `test_ingest_duplicate_event_returns_200_with_same_id` (two overlapping dispatches
  from two POSTs in quick succession).
- `test_websocket.py` and `test_websocket_sessions.py` both use FastAPI's _synchronous_
  `TestClient` + `websocket_connect(...)` (their own docstrings note this is a deliberate
  deviation from the standard async `client` fixture, needed for WebSocket support).
  This spins up its own thread-driven event loop whose teardown timing relative to the
  session-scoped async fixtures produces the same class of error.

## Why this is excluded from Sprint 6 / Sprint 7

- Zero of the 8 failing tests are Replay or Health tests; all new Replay and Health
  tests pass.
- The mechanism (un-awaited `BackgroundTasks` in tests, synchronous `TestClient` for
  WebSocket tests) predates this sprint by multiple sprints (Sprint 2 and Sprint 1
  respectively) and was not touched by any Replay/Health change.
- A real fix requires touching shared test infrastructure and/or the events router's
  background-dispatch pattern — both out of scope for a Replay/Health sprint and
  exactly the kind of "unrelated refactoring" this sprint's engineering rules forbid.
- Not yet confirmed whether this reproduces on Linux/CI at all; a Windows-only local
  workaround risks masking rather than fixing anything, and risks being the wrong fix
  if CI doesn't exhibit the issue.

## Recommended future solution

One (or both) of the following, as a dedicated, independently-scoped piece of work:

1. In tests that call `analysis_service.dispatch()` directly and/or rely on the
   `POST /events` background dispatch, explicitly await the dispatch (or the
   equivalent work) instead of relying on `BackgroundTasks`' fire-and-forget timing,
   so no coroutine is still in flight when the test-session-scoped engine begins
   teardown.
2. Migrate `test_websocket.py` and `test_websocket_sessions.py` off the synchronous
   `TestClient` to an async-native WebSocket testing approach (e.g. httpx's WebSocket
   support once stable, or an async test double for the connection manager), removing
   the second event loop entirely.
3. Confirm (via CI, once available) whether this failure reproduces outside this
   specific Windows environment before prioritizing further.

## Investigation history

- Confirmed reproducible: 223 passed / 8 failed, identical failure set across 3
  consecutive runs.
- Ruled out the sprint's own pytest-asyncio config addition
  (`asyncio_default_fixture_loop_scope` / `asyncio_default_test_loop_scope` in
  `apps/api/pyproject.toml`) as the cause: removing those two lines and re-running the
  failing tests in isolation reproduced the same failure signature.
- Ruled out `ProactorEventLoop` vs. `SelectorEventLoop` as the mechanism: forcing
  `WindowsSelectorEventLoopPolicy` in `conftest.py` produced an identical failure set
  and signatures; change was not kept (verified via `git diff` showing no residual
  change to `conftest.py`).

## Resolution (ENG-1) {#resolution-eng-1}

A dedicated engineering sprint (ENG-1: "Eliminate Windows Test Instability")
re-investigated from first principles instead of assuming the hypothesis above. That
hypothesis turned out to be **incomplete in every respect**:

- FastAPI/Starlette source inspection (0.139.0) confirms dependency-with-yield cleanup
  (the commit inside `get_db()`) runs via `AsyncExitStack.__aexit__` _before_
  `Response.__call__` sends the body, and `BackgroundTasks` only runs _after_ the body is
  sent. Production's commit → respond → background-task ordering was never racy. The
  "un-awaited BackgroundTasks races test teardown" theory was never production's bug —
  the actual bugs were in test infrastructure and one router.
- The 8 original failures were in fact **two unrelated bugs bundled together** by
  coincidence of which tests exercise which code paths, not one shared teardown race.

### Root causes found

**A — Test fixture never committed (5 of the original 8 failures).**
The `client` fixture's `get_db` override did `yield db_session` with no commit, unlike
production's `get_db()`. A background dispatch (or a second connection in the same test)
could never see rows the test's own request had "written." Fixed in
`apps/api/tests/conftest.py`: the override now commits after yield and rolls back on
exception, mirroring production exactly.

**B — Production code hardcoded a session factory it wasn't supposed to (1 of the 8,
and a genuine architecture smell independent of testing).**
`app/features/events/router.py` passed the production `AsyncSessionLocal` directly to
`BackgroundTasks.add_task(analysis_service.dispatch, ...)`, even though
`analysis_service.dispatch()` was explicitly written to take an injectable
`session_factory` "independently testable" (per its own docstring) — the router just
never used that seam. Fixed by adding `get_session_factory()` as a FastAPI dependency in
`app/core/database.py`, having the router `Depends()` on it, and overriding it to the
test session factory in the `client` fixture. This is a real production code
improvement, not a test-only workaround.

**C — Cross-event-loop connection pool reuse (the remaining websocket failures).**
Each `with TestClient(app) as tc:` block runs its own `lifespan` on a fresh worker thread

- event loop (confirmed via `starlette.testclient.TestClient.__enter__` source), but the
  production `engine` singleton's asyncpg connections are bound to whichever loop first
  touched the pool. Reusing or closing them from a different loop is illegal —
  independent of BackgroundTasks entirely. Fixed with `engine.dispose(close=False)` at
  lifespan _startup_ (de-references stale connections from a prior loop without touching
  them — required because `test_health.py` intentionally exercises the real production
  engine directly, so a prior loop's connections are routinely left behind) and
  `engine.dispose()` (full close) at lifespan _shutdown_ (releases the current loop's
  connections before that loop goes away).

**D — Row leakage from the two websocket test files (found only under randomized
file-order stress testing, not in the original bug report).**
`test_websocket.py` and `test_websocket_sessions.py` depended only on schema creation,
never on per-test cleanup — the only two files in the suite with this gap. Their rows
persisted across the run and were picked up by later tests using unfiltered queries
(e.g. `GET /sessions`), causing `test_session_router.py` to fail intermittently
(~40% of randomized-order runs) depending on file order. Fixed by extracting a
`_clean_rows` fixture in `conftest.py` and having both websocket test files depend on it.

### Why this wasn't Windows-specific

None of A–D reference any Windows-only API, event loop policy, or OS-specific timing.
A and B are pure application/test logic bugs; C is a cross-loop connection-safety
violation that would occur under any asyncio event loop implementation (Proactor or
Selector, Windows or Linux) — the WindowsSelectorEventLoopPolicy experiment in the
original report "producing identical failures" is exactly what you'd expect, since the
loop policy was never the mechanism. D is pure Postgres row state, entirely OS-agnostic.
No platform-specific code was added as part of this fix.

### Verification

- 231/231 tests passing across 5 consecutive full-suite runs in default file order.
- 231/231 tests passing across 8 consecutive full-suite runs with randomized file
  ordering (the randomized passes are what originally surfaced root cause D).
- No `sleep()`, retry loop, ignored exception, or platform-specific branch was
  introduced by any of the four fixes.

### Files changed

- `apps/api/app/main.py` — dispose engine pool at lifespan startup and shutdown.
- `apps/api/app/core/database.py` — added `get_session_factory()` dependency.
- `apps/api/app/features/events/router.py` — inject session factory instead of
  importing the production one directly.
- `apps/api/tests/conftest.py` — `client` fixture's `get_db` override now commits;
  extracted `_clean_rows` fixture.
- `apps/api/tests/test_websocket.py`, `apps/api/tests/test_websocket_sessions.py` —
  depend on `_clean_rows`; unique `project_root` per test.
