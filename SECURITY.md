# VibePulse — Security & Privacy Architecture Policy

**Status**: Authoritative Security Policy
**Classification**: Local-First, Zero-Exfiltration, Privacy-by-Design

---

## 🔒 Core Privacy & Security Guarantees

VibePulse is designed from the ground up to observe proprietary intellectual property without compromising developer privacy or risking source code exfiltration:

### 1. Zero Code Exfiltration

- The VibePulse observation daemon operates strictly on your local machine and communicates solely with your configured FastAPI backend (`http://localhost:5184`).
- Zero telemetry, code snippets, or developer activity is transmitted to third-party cloud LLM APIs or external servers.

### 2. AST Secret Redaction by Design

- The static AST inspection engine actively scans for credentials, API keys, passwords, and tokens matching security rule patterns (e.g. `SEC001`).
- All captured secret tokens are masked to `[REDACTED]` in memory **before** persistence into PostgreSQL and before JSON serialization to the UI or Copilot responses.
- Verified across all endpoints: Security Intelligence API, Copilot Retrieval, Knowledge Graph, and `PROJECT_CONTEXT.md` exports.

### 3. Read-Only Observation Boundary

- The telemetry daemon (`apps/daemon`) operates strictly in read-only observation mode.
- The daemon does not possess filesystem write capabilities; it cannot mutate, overwrite, or delete code files in the observed workspace.

### 4. Multi-Project Tenant Isolation

- All database records (`sessions`, `development_events`, `event_analyses`, `incident_review_states`) are strictly scoped by `project_id`.
- Queries, causal graphs, knowledge graphs, and Copilot context for Project A are 100% isolated from Project B.

### 5. Safe Project Deletion Invariant

- Deleting a project through the VibePulse UI or API cascades deletion exclusively to database telemetry records.
- The physical directory and source code files on the developer's disk remain completely untouched.

---

## 🛡️ Supported Versions

| Version / Branch         | Supported          | Security Policy                                              |
| ------------------------ | ------------------ | ------------------------------------------------------------ |
| `v1.0.0-freeze` (master) | :white_check_mark: | Active support for local-first seminar & academic deployment |
| `< 1.0.0`                | :x:                | Historical developmental versions                            |

---

## 🚨 Vulnerability Reporting

If you identify a security or privacy vulnerability, please do NOT create a public GitHub issue.

Please report findings to the repository maintainer or email `security@vibepulse.dev`. We acknowledge reports within 48 hours and provide remediation timelines.

### Scope & Known Constraints

- **Local Dev Deployment**: In `v1.0.0`, API and Dashboard run locally within developer network boundaries without token-based authentication. Authentication and RBAC are scheduled for `v2.0` multi-tenant updates.
- **Physical Host Access**: Scenarios assuming root/administrator access to the underlying machine or raw PostgreSQL server are out of scope.
