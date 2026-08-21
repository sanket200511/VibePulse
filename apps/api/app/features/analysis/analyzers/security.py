"""
Live Security Guardian — detects deterministic security risks.

Findings schema:
{
    "findings": [
        {
            "rule_id": str,
            "title": str,
            "line_number": int,
            "symbol": str,
            "file": str,
            "language": str,
            "timestamp": str,
            "evidence": str,
            "redacted_evidence": str,
            "severity": str,  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
            "category": str,
            "description": str,
            "what": str,
            "why": str,
            "where": str,
            "remediation": str,
            "risk_contribution": int,
            "provenance": str,  # "OBSERVED"
        }
    ]
}
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import ClassVar

from app.core.domain.events import AnalyzableEvent
from app.features.analysis.base import AnalysisContext, AnalysisFinding


@dataclass(frozen=True)
class SecurityRule:
    id: str
    title: str
    description: str
    severity: str
    pattern: re.Pattern
    languages: tuple[str, ...]
    category: str
    why: str
    remediation: str
    risk_contribution: int


# ── Canonical Redaction & False-Positive Helpers ─────────────────────────────

FALSE_POSITIVE_PLACEHOLDERS: set[str] = {
    "your_password_here",
    "your-password-here",
    "your_password",
    "your-password",
    "yourpassword",
    "your_pass_here",
    "your_pass",
    "your-pass",
    "changeme",
    "change_me",
    "change-me",
    "changeit",
    "password",
    "pass",
    "pwd",
    "<password>",
    "<your_password>",
    "<your-password>",
    "<your_password_here>",
    "[password]",
    "{password}",
    "placeholder",
    "example",
    "example_password",
    "sample_password",
    "test_password",
    "xxxx",
    "xxxxx",
    "xxxxxx",
    "******",
    "...",
    "123456",
    "dummy",
    "dummy_password",
    "null",
    "none",
    "nil",
    "undefined",
    "true",
    "false",
    "todo",
}

# Regex for SEC001 assignment-style password and credential exposure
SEC001_ASSIGNMENT_REGEX = re.compile(
    r"""(?ix)
    (?P<before>
        (?:^|[\s,;{\[(])
        (?:const\s+|let\s+|var\s+|export\s+)?
        (?P<quote1>["'])?
        (?P<key>
            database_url|db_url|database_password|database_pass|db_password|db_pass|
            admin_password|root_password|user_password|secret_password|
            auth_password|client_secret|api_secret|app_secret|secret_key|
            api_key|apikey|access_token|auth_token|bearer_token|token|
            private_key|password|passwd|pwd
        )
        (?P=quote1)?
        \s*(?:=|:|:=)\s*
    )
    (?:
        (?P<qvalue>["'])(?P<val_quoted>[^"'\r\n]*)(?P=qvalue)
        |
        (?P<val_unquoted>[^\s#"';,}\]\r\n]+)
    )
    """
)


def is_placeholder_value(val: str) -> bool:
    """Determine if an extracted credential value is a dummy/placeholder."""
    val_clean = val.strip()
    if not val_clean:
        return True
    val_lower = val_clean.lower()
    if val_lower in FALSE_POSITIVE_PLACEHOLDERS:
        return True
    if val_lower.startswith("<") and val_lower.endswith(">"):
        return True
    if val_lower.startswith("${") and val_lower.endswith("}"):
        return True
    if val_lower.startswith("$") and len(val_lower) > 1 and val_lower[1:].isidentifier():
        return True
    unquoted = val_clean.strip("\"'`")
    if not unquoted or unquoted.lower() in FALSE_POSITIVE_PLACEHOLDERS:
        return True
    return False


def redact_assignment(before_str: str) -> str:
    """
    Returns a safe, redacted representation of the assignment.
    NEVER includes the raw secret.
    """
    before_clean = before_str.strip()
    if before_clean.endswith(("=", ":", ":=")):
        return f'{before_clean}"[REDACTED]"'
    return f'{before_clean} "[REDACTED]"'


def redact_sensitive_line(line: str) -> str:
    """Scrub sensitive patterns from any line string."""
    line = re.sub(
        r"(api[_-]?key|secret|token|password|passwd|auth[_-]?token)\s*[:=]\s*['\"][^'\"]+['\"]",
        r'\1 = "[REDACTED]"',
        line,
        flags=re.IGNORECASE,
    )
    line = re.sub(r"sk-[a-zA-Z0-9_-]{20,}", "sk-[REDACTED]", line)
    line = re.sub(
        r"=['\"][A-Za-z0-9/+=]{16,40}['\"]",
        '="[REDACTED]"',
        line,
        flags=re.IGNORECASE,
    )
    return line


class SecurityAnalyzer:
    """
    Scans file contents for deterministic security patterns.
    Strictly redacts all secret values before persistence or broadcast.
    """

    name = "security_guardian"
    version = 2
    description = "Detects deterministic security risks (secrets, dangerous functions, config)."
    priority = 55
    enabled = True

    SUPPORTED_EXTENSIONS: ClassVar[set[str]] = {
        ".env",
        ".env.example",
        ".env.local",
        ".env.test",
        ".env.development",
        ".env.production",
        ".env.staging",
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".yaml",
        ".yml",
        ".toml",
        ".ini",
        ".cfg",
        ".conf",
        ".properties",
        ".txt",
        ".sh",
        ".bash",
        ".zsh",
        ".sql",
        ".php",
        ".rb",
        ".go",
        ".rs",
        ".java",
        ".kt",
        ".cs",
        ".cpp",
        ".c",
    }

    IGNORED_PATH_SUBSTRINGS: ClassVar[tuple[str, ...]] = (
        "node_modules",
        ".git",
        "dist",
        "build",
        "coverage",
        ".venv",
        "venv",
        "__pycache__",
        ".turbo",
        ".next",
        ".pytest_cache",
        ".ruff_cache",
    )

    RULES: ClassVar[list[SecurityRule]] = [
        SecurityRule(
            id="SEC001",
            title="Password / Credential Exposure",
            description=(
                "Credential-like assignment detected. Secret is masked to prevent leakage."
            ),
            severity="HIGH",
            pattern=SEC001_ASSIGNMENT_REGEX,
            languages=("all",),
            category="Secrets",
            why=(
                "Hardcoded credentials in source code risk unauthorized system and database access."
            ),
            remediation=(
                "Move credentials to secure environment variables or a secrets manager "
                "and rotate exposed values immediately."
            ),
            risk_contribution=50,
        ),
        SecurityRule(
            id="HARDCODED_OPENAI_KEY",
            title="Hardcoded OpenAI API Key",
            description="OpenAI API keys should not be hardcoded in code.",
            severity="HIGH",
            pattern=re.compile(r"(?:sk-[a-zA-Z0-9_-]{30,})"),
            languages=("python", "typescript", "javascript", "all"),
            category="Secrets",
            why="Exposed API keys allow unauthorized model invocations and billable quota theft.",
            remediation="Store API key in OPENAI_API_KEY environment variable and rotate key.",
            risk_contribution=50,
        ),
        SecurityRule(
            id="AWS_SECRET",
            title="AWS Access Key / Secret",
            description="AWS credentials should not be hardcoded in source files.",
            severity="HIGH",
            pattern=re.compile(
                r"(?i)(?:aws_access_key_id|aws_secret_access_key)\s*=\s*['\"][A-Za-z0-9/+=]{16,40}['\"]"
            ),
            languages=("python", "typescript", "javascript", "all"),
            category="Secrets",
            why="Exposing cloud provider credentials risks cloud infrastructure compromise.",
            remediation="Use IAM roles, AWS Secrets Manager, or ~/.aws/credentials.",
            risk_contribution=50,
        ),
        SecurityRule(
            id="PRIVATE_KEY",
            title="Private Cryptographic Key",
            description="Private keys must not be stored in source code.",
            severity="HIGH",
            pattern=re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----"),
            languages=("python", "typescript", "javascript", "all"),
            category="Secrets",
            why="Private key exposure compromises encryption, signatures, and host authentication.",
            remediation="Move private key to a secure key store or encrypted vault.",
            risk_contribution=50,
        ),
        SecurityRule(
            id="EVAL_USAGE",
            title="Dangerous Function: eval()",
            description="Dynamic evaluation of code via eval() can execute arbitrary commands.",
            severity="HIGH",
            pattern=re.compile(r"\beval\s*\("),
            languages=("python", "typescript", "javascript"),
            category="Dangerous Execution",
            why=(
                "eval() allows untrusted input to execute arbitrary code "
                "with application privileges."
            ),
            remediation="Replace dynamic evaluation with explicit parsing or AST interpreters.",
            risk_contribution=30,
        ),
        SecurityRule(
            id="EXEC_USAGE",
            title="Dangerous Function: exec()",
            description="Dynamic evaluation of code via exec() can execute arbitrary statements.",
            severity="HIGH",
            pattern=re.compile(r"\bexec\s*\("),
            languages=("python",),
            category="Dangerous Execution",
            why="exec() dynamically executes strings as code, leading to remote code execution.",
            remediation="Refactor code to use explicit dispatch tables or handlers.",
            risk_contribution=30,
        ),
        SecurityRule(
            id="SUBPROCESS_SHELL_TRUE",
            title="subprocess with shell=True",
            description="Using shell=True allows shell injection attacks.",
            severity="HIGH",
            pattern=re.compile(
                r"\bsubprocess\.(?:Popen|call|run|check_call|check_output)\s*\([^)]*shell\s*=\s*True"
            ),
            languages=("python",),
            category="Dangerous Execution",
            why=(
                "shell=True passes commands through a shell interpreter, "
                "enabling command injection."
            ),
            remediation="Pass command arguments as an array with shell=False.",
            risk_contribution=30,
        ),
        SecurityRule(
            id="PICKLE_LOADS",
            title="Unsafe Deserialization: pickle",
            description="pickle deserialization can construct arbitrary executable objects.",
            severity="HIGH",
            pattern=re.compile(r"\bpickle\.(?:loads|load)\s*\("),
            languages=("python",),
            category="Deserialization",
            why="Unpickling untrusted byte streams leads to direct remote code execution.",
            remediation="Use safe serialization formats such as JSON or Protocol Buffers.",
            risk_contribution=25,
        ),
        SecurityRule(
            id="YAML_UNSAFE_LOAD",
            title="Unsafe YAML Load",
            description="Using yaml.load without SafeLoader allows arbitrary code execution.",
            severity="HIGH",
            pattern=re.compile(r"\byaml\.load\s*\(\s*[^,]+(?!,\s*Loader=yaml\.SafeLoader)"),
            languages=("python",),
            category="Deserialization",
            why="PyYAML's default loader can instantiate arbitrary Python objects.",
            remediation="Use yaml.safe_load() or specify Loader=yaml.SafeLoader.",
            risk_contribution=25,
        ),
        SecurityRule(
            id="OS_SYSTEM",
            title="OS System Command Execution",
            description="os.system executes shell commands without argument sanitization.",
            severity="HIGH",
            pattern=re.compile(r"\bos\.system\s*\("),
            languages=("python",),
            category="Dangerous Execution",
            why="os.system executes arguments directly in the system shell.",
            remediation="Use subprocess.run with an argument list and shell=False.",
            risk_contribution=25,
        ),
        SecurityRule(
            id="MD5_USAGE",
            title="Weak Cryptography: MD5",
            description="MD5 is cryptographically broken and vulnerable to collision attacks.",
            severity="LOW",
            pattern=re.compile(r"\b(?:hashlib\.)?md5\s*\("),
            languages=("python", "typescript", "javascript"),
            category="Cryptography",
            why=(
                "MD5 is vulnerable to practical collision generation and "
                "should not be used for security."
            ),
            remediation="Upgrade to SHA-256 (SHA2) or SHA-3 for secure hashing.",
            risk_contribution=10,
        ),
        SecurityRule(
            id="SHA1_USAGE",
            title="Weak Cryptography: SHA-1",
            description="SHA-1 has known theoretical and practical collision weaknesses.",
            severity="LOW",
            pattern=re.compile(r"\b(?:hashlib\.)?sha1\s*\("),
            languages=("python", "typescript", "javascript"),
            category="Cryptography",
            why="SHA-1 is deprecated for digital signatures and integrity protection.",
            remediation="Upgrade to SHA-256 (hashlib.sha256) or SHA-512.",
            risk_contribution=10,
        ),
        SecurityRule(
            id="VERIFY_FALSE",
            title="Disabled TLS / SSL Verification",
            description="Disabling TLS certificate verification allows Man-In-The-Middle attacks.",
            severity="HIGH",
            pattern=re.compile(
                r"\brequests\.(?:get|post|put|delete|patch|request)\s*\([^)]*verify\s*=\s*False"
            ),
            languages=("python",),
            category="Network & Transport",
            why=(
                "Disabling certificate validation allows network attackers to "
                "intercept and tamper with traffic."
            ),
            remediation="Ensure verify=True and configure trusted CA certificate bundles.",
            risk_contribution=25,
        ),
        SecurityRule(
            id="DEBUG_TRUE",
            title="Debug Mode Enabled in Configuration",
            description="Framework debug mode exposes interactive tracebacks and consoles.",
            severity="MEDIUM",
            pattern=re.compile(r"(?i)debug\s*=\s*True"),
            languages=("python", "typescript", "javascript", "ini", "toml"),
            category="Configuration Risk",
            why=(
                "Debug mode can leak environment variables, source code, and internal system paths."
            ),
            remediation="Disable debug mode (DEBUG=False) in staging and production environments.",
            risk_contribution=15,
        ),
        SecurityRule(
            id="PERMISSIVE_CORS",
            title="Permissive Wildcard CORS Configuration",
            description=(
                "allow_origins=['*'] allows any external domain to make authenticated requests."
            ),
            severity="MEDIUM",
            pattern=re.compile(r"""(?:allow_origins\s*=\s*\[\s*["']\*["']\s*\])"""),
            languages=("python", "typescript", "javascript"),
            category="Configuration Risk",
            why="Wildcard origin allowances permit cross-origin requests from arbitrary websites.",
            remediation="Specify explicit trusted origin domains rather than wildcard *.",
            risk_contribution=15,
        ),
        SecurityRule(
            id="TODO_SECURITY",
            title="Unresolved Security TODO",
            description="Found a security-related TODO marker in source code.",
            severity="LOW",
            pattern=re.compile(r"(?i)#\s*TODO\s*SECURITY|//\s*TODO\s*SECURITY"),
            languages=("python", "typescript", "javascript"),
            category="Process & Debt",
            why="Security debts and deferred fixes may leave open vulnerabilities in production.",
            remediation="Review and implement the required security control before release.",
            risk_contribution=5,
        ),
    ]

    def _resolve_language(self, ext: str, file_name: str) -> str:
        if ext in (".py",):
            return "python"
        if ext in (".ts", ".tsx"):
            return "typescript"
        if ext in (".js", ".jsx"):
            return "javascript"
        if ext in (".json",):
            return "json"
        if ext in (".yaml", ".yml"):
            return "yaml"
        if ext in (".toml",):
            return "toml"
        if ext in (".ini", ".cfg", ".conf"):
            return "ini"
        if file_name.startswith(".env") or ext.startswith(".env"):
            return "env"
        return "text"

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        if event.event_type not in ("FILE_CREATED", "FILE_MODIFIED"):
            return None

        if not event.file_path or not event.project_root:
            return None

        # Ignore non-code or ignored paths
        norm_path = event.file_path.replace("\\", "/").lower()
        if any(
            f"/{ignored}/" in f"/{norm_path}/" or norm_path.startswith(f"{ignored}/")
            for ignored in self.IGNORED_PATH_SUBSTRINGS
        ):
            return None

        file_name = (event.file_name or os.path.basename(event.file_path)).lower()
        ext = (event.file_extension or os.path.splitext(file_name)[1] or "").lower()

        # Check supported files
        is_env_file = file_name.startswith(".env") or ext.startswith(".env")
        if not is_env_file and ext not in self.SUPPORTED_EXTENSIONS:
            return None

        lang = self._resolve_language(ext, file_name)

        if os.path.isabs(event.file_path):
            full_path = event.file_path
        else:
            full_path = os.path.join(event.project_root, event.file_path)

        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None

        # Reject large files (> 1MB)
        try:
            if os.path.getsize(full_path) > 1_048_576:
                return None
        except OSError:
            return None

        try:
            with open(full_path, encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except OSError:
            return None

        findings: list[dict[str, object]] = []
        target_display = event.file_name or event.file_path or ""

        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if not line_stripped or line_stripped.startswith(("#", "//", "/*", "*")):
                continue

            for rule in self.RULES:
                if "all" not in rule.languages and lang not in rule.languages:
                    continue

                if rule.id == "SEC001":
                    match = rule.pattern.search(line_stripped)
                    if not match:
                        continue

                    val = match.group("val_quoted") or match.group("val_unquoted") or ""
                    if is_placeholder_value(val):
                        continue

                    before = match.group("before")
                    redacted = redact_assignment(before)

                    findings.append(
                        {
                            "rule_id": rule.id,
                            "title": rule.title,
                            "line_number": i + 1,
                            "symbol": redacted,
                            "file": target_display,
                            "language": lang,
                            "timestamp": event.timestamp.isoformat(),
                            "evidence": redacted,
                            "redacted_evidence": redacted,
                            "severity": rule.severity,
                            "category": rule.category,
                            "description": rule.description,
                            "what": f"Credential-like assignment in {target_display}",
                            "why": rule.why,
                            "where": f"{target_display}:{i + 1}",
                            "remediation": rule.remediation,
                            "risk_contribution": rule.risk_contribution,
                            "provenance": "OBSERVED",
                        }
                    )
                else:
                    match = rule.pattern.search(line_stripped)
                    if match:
                        matched_str = match.group(0)
                        # Redact secret rules if matching OpenAI / AWS / Private key
                        if rule.category == "Secrets":
                            if "sk-" in matched_str:
                                redacted = re.sub(
                                    r"sk-[a-zA-Z0-9_-]{20,}", "sk-[REDACTED]", line_stripped
                                )
                            elif "aws" in matched_str.lower():
                                redacted = re.sub(
                                    r"=['\"][A-Za-z0-9/+=]{16,40}['\"]",
                                    '="[REDACTED]"',
                                    line_stripped,
                                    flags=re.IGNORECASE,
                                )
                            else:
                                redacted = "[REDACTED_SECRET]"
                        else:
                            redacted = redact_sensitive_line(line_stripped)
                            if len(redacted) > 120:
                                redacted = redacted[:117] + "..."

                        findings.append(
                            {
                                "rule_id": rule.id,
                                "title": rule.title,
                                "line_number": i + 1,
                                "symbol": (redacted if rule.category == "Secrets" else matched_str),
                                "file": target_display,
                                "language": lang,
                                "timestamp": event.timestamp.isoformat(),
                                "evidence": redacted,
                                "redacted_evidence": redacted,
                                "severity": rule.severity,
                                "category": rule.category,
                                "description": rule.description,
                                "what": f"{rule.title} in {target_display}",
                                "why": rule.why,
                                "where": f"{target_display}:{i + 1}",
                                "remediation": rule.remediation,
                                "risk_contribution": rule.risk_contribution,
                                "provenance": "OBSERVED",
                            }
                        )

        if not findings:
            return None

        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={"findings": findings},
        )
