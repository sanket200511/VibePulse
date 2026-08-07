# Frequently Asked Questions (FAQ)

## 1. What makes VibePulse different from WakaTime or GitHub Copilot?

VibePulse is not an IDE plugin that tracks hours, nor is it an AI that generates code.

VibePulse is an **Engineering Search & Investigation Engine**. It sits passively on the filesystem edge, observing what changes and _how_ it changes, then restructures those raw observations into semantic Timelines, Replays, and Engineering DNA summaries.

## 2. Does VibePulse send my code to the cloud?

**No.** The VibePulse daemon observes file events (like "File Modified: src/main.ts") locally. It performs lightweight AST parsing directly on your laptop and sends only structured metadata (functions added, classes removed, security TODOs introduced) to your self-hosted backend. The source code itself is never sent to a third-party server.

## 3. Why FastAPI and Python instead of a pure Node.js stack?

Python was explicitly chosen for the API layer due to its unrivaled ecosystem for static analysis (e.g., `tree-sitter` bindings, `ast`) and AI/ML orchestration. Because VibePulse will eventually utilize complex heuristics for AI Provenance, Python provides the strongest foundation for the backend.

FastAPI provides native asynchronous I/O, which is necessary for high-throughput event ingestion and WebSocket fan-out, mitigating Python's traditional concurrency limitations.

## 4. How does the Replay Engine work if VibePulse doesn't store file contents?

VibePulse does not operate like a Git commit or a video recorder. The Replay Engine works by chronologically navigating through the structured `DevelopmentEvent` metadata. When you play a Replay, you are stepping through a highly accurate semantic reconstruction of _what_ structural pieces of your code were modified, when, and in what context (languages, directories), not the literal source code strings themselves.

## 5. Can I use VibePulse with multiple developers on a team?

VibePulse v1.0.0 is optimized for single-project or single-developer workspaces. The foundational architecture (Event Pipeline, Session Engine) is complete.

Multi-user authentication, team workspaces, and RBAC (Role-Based Access Control) are explicitly scheduled for **Phase 5 (Production Readiness - v1.1.0)**. See the [Roadmap](ROADMAP.md) for details.

## 6. How do I fix the "MissingGreenlet" or "IntegrityError" in the tests?

If you are running the API tests and encounter `MissingGreenlet` errors, this usually happens because asynchronous `BackgroundTasks` are outliving the test's isolated database transaction.

VibePulse v1.0.0 includes a deterministic test teardown process in `tests/conftest.py` that waits for all background tasks to drain before destroying the session. Ensure you are running the test suite via the provided `uv run pytest` command and not attempting to run tests in parallel without a database lock.
