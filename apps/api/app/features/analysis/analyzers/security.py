"""
Live Security Guardian — detects deterministic security risks.

Findings schema
---------------
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
            "severity": str,  # "HIGH", "MEDIUM", "LOW"
            "category": str,
            "description": str,
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


class SecurityAnalyzer:
    """
    Scans file contents for deterministic security patterns.
    Strictly redacts all secret values before persistence or broadcast.
    """

    name = "security_guardian"
    version = 1
    description = "Detects deterministic security risks (secrets, dangerous functions)."
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
                "Credential-like value detected. Secret is masked to prevent credential leakage."
            ),
            severity="HIGH",
            pattern=SEC001_ASSIGNMENT_REGEX,
            languages=("all",),
            category="Secrets",
        ),
        SecurityRule(
            id="HARDCODED_OPENAI_KEY",
            title="Hardcoded OpenAI Key",
            description="OpenAI API keys should not be hardcoded.",
            severity="HIGH",
            pattern=re.compile(r"(?:sk-[a-zA-Z0-9_-]{30,})"),
            languages=("python", "typescript", "javascript", "all"),
            category="Secrets",
        ),
        SecurityRule(
            id="AWS_SECRET",
            title="AWS Access Key",
            description="AWS credentials should not be hardcoded.",
            severity="HIGH",
            pattern=re.compile(
                r"(?i)(?:aws_access_key_id|aws_secret_access_key)\s*=\s*['\"][A-Za-z0-9/+=]{16,40}['\"]"
            ),
            languages=("python", "typescript", "javascript", "all"),
            category="Secrets",
        ),
        SecurityRule(
            id="PRIVATE_KEY",
            title="Private Key",
            description="Private keys must not be stored in source code.",
            severity="HIGH",
            pattern=re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----"),
            languages=("python", "typescript", "javascript", "all"),
            category="Secrets",
        ),
        SecurityRule(
            id="EVAL_USAGE",
            title="Dangerous Function: eval()",
            description="eval() can execute arbitrary code.",
            severity="MEDIUM",
            pattern=re.compile(r"\beval\s*\("),
            languages=("python", "typescript", "javascript"),
            category="Injection",
        ),
        SecurityRule(
            id="EXEC_USAGE",
            title="Dangerous Function: exec()",
            description="exec() can execute arbitrary code.",
            severity="MEDIUM",
            pattern=re.compile(r"\bexec\s*\("),
            languages=("python",),
            category="Injection",
        ),
        SecurityRule(
            id="SUBPROCESS_SHELL_TRUE",
            title="subprocess with shell=True",
            description="Using shell=True can lead to shell injection vulnerabilities.",
            severity="HIGH",
            pattern=re.compile(
                r"\bsubprocess\.(?:Popen|call|run|check_call|check_output)\s*\([^)]*shell\s*=\s*True"
            ),
            languages=("python",),
            category="Injection",
        ),
        SecurityRule(
            id="PICKLE_LOADS",
            title="Unsafe Deserialization: pickle",
            description="Pickle is not secure against erroneous or maliciously constructed data.",
            severity="HIGH",
            pattern=re.compile(r"\bpickle\.(?:loads|load)\s*\("),
            languages=("python",),
            category="Deserialization",
        ),
        SecurityRule(
            id="YAML_UNSAFE_LOAD",
            title="Unsafe YAML Load",
            description="Using yaml.load without SafeLoader is unsafe.",
            severity="HIGH",
            pattern=re.compile(r"\byaml\.load\s*\(\s*[^,]+(?!,\s*Loader=yaml\.SafeLoader)"),
            languages=("python",),
            category="Deserialization",
        ),
        SecurityRule(
            id="OS_SYSTEM",
            title="OS System Execution",
            description="os.system is prone to shell injection.",
            severity="MEDIUM",
            pattern=re.compile(r"\bos\.system\s*\("),
            languages=("python",),
            category="Injection",
        ),
        SecurityRule(
            id="MD5_USAGE",
            title="Weak Crypto: MD5",
            description="MD5 is considered cryptographically weak.",
            severity="LOW",
            pattern=re.compile(r"\b(?:hashlib\.)?md5\s*\("),
            languages=("python", "typescript", "javascript"),
            category="Cryptography",
        ),
        SecurityRule(
            id="SHA1_USAGE",
            title="Weak Crypto: SHA1",
            description="SHA1 is considered cryptographically weak.",
            severity="LOW",
            pattern=re.compile(r"\b(?:hashlib\.)?sha1\s*\("),
            languages=("python", "typescript", "javascript"),
            category="Cryptography",
        ),
        SecurityRule(
            id="VERIFY_FALSE",
            title="Disabled TLS Verification",
            description="Disabling TLS verification enables MITM attacks.",
            severity="HIGH",
            pattern=re.compile(
                r"\brequests\.(?:get|post|put|delete|patch|request)\s*\([^)]*verify\s*=\s*False"
            ),
            languages=("python",),
            category="Network",
        ),
        SecurityRule(
            id="DEBUG_TRUE",
            title="Debug Mode Enabled",
            description="Running frameworks in debug mode in production is dangerous.",
            severity="MEDIUM",
            pattern=re.compile(r"(?i)debug\s*=\s*True"),
            languages=("python",),
            category="Configuration",
        ),
        SecurityRule(
            id="TODO_SECURITY",
            title="Security TODO",
            description="Found a security-related TODO comment.",
            severity="LOW",
            pattern=re.compile(r"(?i)#\s*TODO\s*SECURITY|//\s*TODO\s*SECURITY"),
            languages=("python", "typescript", "javascript"),
            category="Process",
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
                            "file": event.file_name or event.file_path or "",
                            "language": lang,
                            "timestamp": event.timestamp.isoformat(),
                            "evidence": redacted,
                            "redacted_evidence": redacted,
                            "severity": rule.severity,
                            "category": rule.category,
                            "description": rule.description,
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
                                    r"sk-[a-zA-Z0-9_-]{30,}", "sk-[REDACTED]", line_stripped
                                )
                            elif "aws" in matched_str.lower():
                                redacted = re.sub(
                                    r"=['\"][A-Za-z0-9/+=]{16,40}['\"]",
                                    '="[REDACTED]"',
                                    line_stripped,
                                )
                            else:
                                redacted = "[REDACTED_SECRET]"
                        else:
                            redacted = line_stripped
                            if len(redacted) > 100:
                                redacted = redacted[:97] + "..."

                        findings.append(
                            {
                                "rule_id": rule.id,
                                "title": rule.title,
                                "line_number": i + 1,
                                "symbol": redacted if rule.category == "Secrets" else matched_str,
                                "file": event.file_name or event.file_path or "",
                                "language": lang,
                                "timestamp": event.timestamp.isoformat(),
                                "evidence": redacted,
                                "redacted_evidence": redacted,
                                "severity": rule.severity,
                                "category": rule.category,
                                "description": rule.description,
                            }
                        )

        if not findings:
            return None

        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={"findings": findings},
        )
