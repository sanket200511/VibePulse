# VibePulse Roadmap

## Vision

VibePulse exists to make software development itself observable — not the running production system, but the process that produces it. As AI-assisted coding shortens the distance between an idea and a merged change, the industry has gained speed but lost visibility: commits get larger, sessions get faster, and the tools that once let a team reason about "how is this codebase evolving" (careful code review, slow deliberate commits) no longer scale to the pace of AI-assisted work.

The long-term vision is a Developer Observability Platform that sits alongside version control the way an APM tool sits alongside a production service — continuously ingesting signal about how code is written, session by session, and turning that signal into intelligence a team can act on: where attention is going, how sessions are shaped, and eventually, how much of a codebase carries the fingerprint of AI assistance and what that means for its health. VibePulse is not trying to write code faster. It is trying to make the growing volume of AI-assisted development legible.

---

## Design Philosophy

**Passive observation instead of code generation.** VibePulse never writes, suggests, or modifies code. Every capability on this roadmap is built from data the platform observes, not code it produces. This is a deliberate boundary, not a current limitation — it is what keeps VibePulse trustworthy to point at any codebase, including ones it has no business editing.

**AI augmentation rather than AI dependency.** AI is used to interpret signal (e.g. a future AI-generated session summary), never to gate whether the platform functions. Every AI-augmented capability is designed with a working non-AI fallback first, so the platform degrades gracefully rather than depending on a model being available or correct.

**Provider-agnostic AI.** Wherever AI is introduced, it sits behind an interface (the same pattern already established by `SessionSummaryGenerator`), so no future capability is architecturally married to a specific model vendor.

**Feature-first architecture.** Capabilities are organized as independent, deletable feature modules rather than being smeared across shared layers. This is what lets the roadmap below add Session Timeline, Replay, and Health Engine as new modules rather than as modifications to existing ones.

**Modular pipelines.** The Analysis Pipeline and Session Engine are both built as pipelines of independent, composable stages. New analyzers or new session-derived insights are additions to a registry, not rewrites of a monolith.

**Incremental evolution.** Every phase below is designed to ship on top of what already exists, using data already being collected wherever possible, rather than requiring new observation infrastructure per feature. Session Timeline, Replay, and Health Engine all read from the same events/sessions data the platform already captures.

---

## Development Phases

### Phase 1 — Foundation

**Goal:** Establish a monorepo, architectural conventions, and delivery infrastructure capable of supporting years of iterative development without needing to be re-architected.

**Delivered capabilities:** Monorepo and workspace tooling, ADR-driven decision-making, CI/CD, containerized infrastructure, and the feature-first conventions that every subsequent phase depends on.

**Future capabilities:** None — this phase is intentionally foundational and closed; later phases build on it rather than extend it.

### Phase 2 — Developer Intelligence

**Goal:** Prove that development activity can be observed and structured in real time, from raw filesystem events up to a coherent session.

**Delivered capabilities:** Real-time event ingestion, an extensible analysis pipeline that enriches each event, and a Session Engine that turns a stream of events into a lifecycle-aware session with live metrics.

**Future capabilities:** A Session Timeline that presents this already-structured data as a navigable narrative, and a Replay Engine that reconstructs the sequence of change across a session.

### Phase 3 — Developer Insights

**Goal:** Move from showing what happened to explaining what it means — surfacing patterns, trends, and health signals a developer or reviewer wouldn't otherwise notice.

**Delivered capabilities:** None yet — this phase begins once Session Timeline and Replay are in place.

**Future capabilities:** A Health Engine scoring sessions and projects across complexity, consistency, and pacing; cross-session analytics; and export tooling so teams can pull VibePulse data into their own reporting.

### Phase 4 — AI Intelligence

**Goal:** Apply AI to the data VibePulse has already collected, rather than to code generation, to answer the question "how much of this, and which parts, were AI-assisted — and how did that shape the outcome?"

**Delivered capabilities:** A pluggable summary-generation interface (`SessionSummaryGenerator`), already provider-agnostic and ready for an AI-backed implementation.

**Future capabilities:** AI Fingerprint detection, a Prompt Vault for correlating prompts with resulting changes, and AI-generated session and project summaries built on the same pluggable interface.

### Phase 5 — Production Readiness

**Goal:** Harden VibePulse from a working platform into one that can be deployed, trusted, and operated outside a single developer's machine.

**Delivered capabilities:** None yet — deliberately deferred until the observability core (Phases 2–4) has proven its value.

**Future capabilities:** Authentication and authorization, multi-project/multi-user operation, deployment tooling, and the operational guarantees (backup, monitoring, upgrade paths) a production system requires.

---

## Detailed Sprint Roadmap

**Completed** (see `PROJECT_STATUS.md` for full delivery detail on each):

- Foundation
- Sprint 1 — Event Pipeline
- Sprint 2 — Analysis Pipeline
- Hardening Sprint
- Sprint 3 — Session Intelligence

**Planned:**

- Session Timeline — chronological, per-session narrative view over existing event/session data
- Replay Engine — reconstruct and step through a session's file changes in sequence
- Health Engine — score sessions and projects on complexity, consistency, and pacing
- AI Fingerprint — detect AI-assisted authorship signatures within observed activity
- Prompt Vault — correlate prompts with the changes they produced
- Analytics — cross-session and cross-project trend reporting
- Export — let teams extract VibePulse data into their own tooling
- Production Readiness — auth, multi-tenancy, deployment, and operational hardening
- Public Release — the first release intended for use outside the core team

---

## Version Roadmap

- **v0.1** — Event Pipeline: the platform can observe a project and stream its events live. Proves the core observation loop works end to end.
- **v0.2** — Session Intelligence: events are structured into lifecycle-aware sessions with domain-level metrics and summaries. Current release.
- **v0.3** — Developer Insights: Session Timeline and Replay Engine ship, turning stored data into a narrative a human can review.
- **v0.4** — Health & Analytics: the Health Engine and cross-session analytics ship, moving the platform from descriptive to evaluative.
- **v0.5** — AI Intelligence: AI Fingerprint and Prompt Vault ship behind the existing provider-agnostic interface, plus data export.
- **v1.0** — Production-ready platform: authentication, multi-project operation, deployment tooling, and the stability guarantees needed for a public release.

---

## Post-v1 Vision

The following are intentionally postponed past v1.0 — not because they lack value, but because each one assumes a stable, trusted, single-project core that does not exist yet, and building them earlier would mean building on shifting ground:

- **VS Code Extension / Cursor Extension** — an in-editor surface only makes sense once the underlying data model (sessions, analysis, health) has stopped changing shape; building it earlier would mean rebuilding it repeatedly.
- **Team Workspaces** — requires the multi-user and authentication foundation that is explicitly out of scope until Phase 5; postponing it keeps the current single-project model simple to reason about.
- **Enterprise Edition** — implies support, compliance, and SLA commitments that are premature before the core platform has proven itself on real projects.
- **Plugin Marketplace** — extensibility for third parties requires a stable public API surface; the platform's own internal interfaces (analyzers, summary generators) are still evolving and not yet ready to be frozen as a public contract.
- **Cloud Sync** — introduces data residency, security, and availability obligations that shouldn't be taken on before Production Readiness (Phase 5) has shipped.
- **Multi-user Collaboration** — depends on the same auth/multi-tenancy foundation as Team Workspaces, and is deliberately sequenced after it rather than in parallel, to avoid designing collaboration semantics on top of an identity model that doesn't exist yet.

---

## Engineering Strategy

VibePulse evolves one capability at a time, deliberately, rather than in parallel:

```
Capability
    ↓
Review
    ↓
Hardening
    ↓
Next Capability
```

Each capability is scoped to a single sprint and lands as an independent, feature-first module. Once it lands, it goes through review — both a design review (recorded as an ADR when the decision is architecturally significant) and a practical review against the running system, not just its tests. Only after review does hardening happen: closing gaps found during review, paying down any debt intentionally taken on to ship the capability, and validating the module holds up under the project's existing lint/typecheck/test bar. Only once a capability is reviewed and hardened does the roadmap move to the next one.

This is why the roadmap above is sequential rather than a wishlist of parallel workstreams: Session Timeline and Replay depend on Session Intelligence having already been hardened, Health Engine depends on Timeline and Replay existing to score against, and AI Intelligence depends on all of the above being stable enough to be worth explaining with AI in the first place. The Hardening Sprint that already sits between Sprint 2 and Sprint 3 in the project's history is not an exception to this strategy — it is the strategy, applied.

---

## Non-Goals

VibePulse intentionally does **not** aim to:

- **Generate code.** VibePulse is an observation platform, not a code generator. Blurring that line would compromise the trust required to point it at any codebase — a tool that both writes code and reports on how code was written has an inherent conflict of interest.
- **Replace AI coding assistants.** Tools like Copilot or Cursor operate _during_ authorship, in the editor, assisting the act of writing code. VibePulse operates _around_ authorship, observing what already happened. These are complementary layers, not competing ones — VibePulse's roadmap (AI Fingerprint) is specifically about understanding the output of those tools, not substituting for them.
- **Replace Git.** Git is the authoritative history of _what_ changed and _why_ (via commit messages). VibePulse observes the _process_ that led there — file-by-file, session-by-session activity that never becomes its own commit. Duplicating Git's role would be redundant; VibePulse is designed to sit alongside it, not inside it.
- **Replace CI/CD.** CI/CD answers "does this change build, pass tests, and deploy correctly?" VibePulse never touches build, test, or deployment pipelines — it has nothing to say about correctness or release readiness, only about how the work leading up to a change was shaped.
- **Replace IDEs.** VibePulse has no editing surface and no intention of building one. It is a passive observer of whatever IDE or editor a developer already uses, by design — requiring a specific editor would fragment adoption and contradict the "observe, don't intrude" principle.
- **Become another chatbot.** VibePulse's dashboard is a data surface, not a conversational interface. Even the AI-augmented capabilities on the roadmap (AI Fingerprint, AI-generated summaries) are designed to produce structured, reviewable output — not a chat window standing between a developer and their own data.
- **Perform production application monitoring.** VibePulse observes the development process, not a running production service. That is the job of APM tools (Datadog, Grafana, etc.), which already solve production observability well. Conflating the two would pull the platform's scope toward infrastructure concerns that have nothing to do with how code was written.

Each of these boundaries exists to keep VibePulse's scope coherent: it is a single-purpose observability layer for the development process itself, not a general-purpose developer tool suite.

---

## Success Criteria

**v0.5 — AI Intelligence**

- AI Fingerprint produces a per-session or per-file classification (AI-assisted vs. human-authored likelihood) that is measurably better than chance on a labeled test set the team constructs internally.
- Prompt Vault correlates at least one real prompt source with the resulting `DevelopmentEvent`s for a session, end to end, without manual data entry.
- The existing `SessionSummaryGenerator` interface gains a second, AI-backed implementation that can be swapped in via configuration alone — zero changes required in `sessions/service.py` or any lifecycle code.
- All new AI-dependent capabilities ship with a working non-AI fallback path, per the Design Philosophy above — none of them are allowed to make the platform non-functional if a model is unavailable.

**v1.0 — Production-Ready Platform**

- Authentication and authorization are enforced on every REST and WebSocket endpoint — zero unauthenticated write paths.
- The platform runs correctly with more than one API replica behind a load balancer — meaning the session sweep loop's current single-instance assumption (documented as technical debt in `PROJECT_STATUS.md`) has been resolved, not just documented.
- A documented, repeatable deployment path exists (container images + a deployment guide) that a team member other than the original author can follow to stand up a working instance from scratch.
- The backend test suite passes fully (100%) in a clean CI environment with no live-database-dependent failures, closing the current gap where 35 of 113 tests require a running Postgres instance.

**Long-term vision**

- A development team can look at VibePulse's data for their own codebase and make a real engineering or process decision from it (e.g. adjusting review focus, identifying a session pattern worth discussing) — success is measured by actual usage changing behavior, not by feature count.
- The AI Fingerprint and Prompt Vault capabilities are accurate and trusted enough that a team would cite VibePulse's output in a real retrospective or code review discussion, not treat it as a novelty.
- VibePulse's own development continues to follow the Capability → Review → Hardening → Next Capability strategy described above, with every architecturally significant decision still recorded as an ADR — the engineering process that built the platform remains the process that evolves it.
