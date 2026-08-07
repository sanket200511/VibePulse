# Security Policy

VibePulse is designed to observe sensitive intellectual property (source code). We take the security of this platform extremely seriously.

## Supported Versions

Only the most recent major version is currently supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| 0.x.x   | :x:                |

## Architecture Security Guarantees

- **No Code Exfiltration**: The VibePulse daemon does not upload source code to third-party services. All processing (AST extraction, Git context) happens strictly on the local machine and your self-hosted backend.
- **Read-Only Daemon**: The Node.js watcher operates in read-only mode and has no mechanism to write, modify, or delete files in the observed workspace.
- **Idempotent Storage**: Duplicate payloads are discarded natively by the database, preventing flood attacks from misconfigured daemons.

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT report it by opening a public GitHub issue.

Instead, please send an email to `security@vibepulse.dev` (or the repository maintainer directly).

We will acknowledge receipt within 48 hours and provide a timeline for triage and resolution.

### What to include in your report:

- A detailed description of the vulnerability.
- Steps to reproduce the issue (including any necessary payloads or environment configuration).
- Potential impact and risk assessment.

### Out of Scope

The following are currently out of scope for security reports:

- Lack of authentication/authorization in `v1.0.0`. (This is a known, documented limitation for internal-only deployments, scheduled to be fixed in `v1.1.0`).
- Vulnerabilities that require full access to the developer's local machine or the PostgreSQL database.
- Denial of Service (DoS) attacks requiring massive compute resources.

Thank you for helping keep VibePulse secure!
