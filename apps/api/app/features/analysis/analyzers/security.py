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
            "severity": str  # "HIGH", "MEDIUM", "LOW"
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


class SecurityAnalyzer:
    """
    Scans file contents for deterministic security patterns.
    """

    name = "security_guardian"
    version = 1
    description = "Detects deterministic security risks (secrets, dangerous functions)."
    priority = 55
    enabled = True

    RULES: ClassVar[list[SecurityRule]] = [
        SecurityRule(
            id="HARDCODED_OPENAI_KEY",
            title="Hardcoded OpenAI Key",
            description="OpenAI API keys should not be hardcoded.",
            severity="HIGH",
            pattern=re.compile(r"(?:sk-[a-zA-Z0-9_-]{30,})"),
            languages=("python", "typescript", "javascript"),
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
            languages=("python", "typescript", "javascript"),
            category="Secrets",
        ),
        SecurityRule(
            id="HARDCODED_PASSWORD",
            title="Hardcoded Password",
            description="Avoid plaintext passwords in source code.",
            severity="HIGH",
            pattern=re.compile(r"(?i)(?:password|passwd|pwd)\s*=\s*['\"][^'\"]+['\"]"),
            languages=("python", "typescript", "javascript"),
            category="Secrets",
        ),
        SecurityRule(
            id="PRIVATE_KEY",
            title="Private Key",
            description="Private keys must not be stored in source code.",
            severity="HIGH",
            pattern=re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----"),
            languages=("python", "typescript", "javascript"),
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

    def analyze(
        self,
        event: AnalyzableEvent,
        context: AnalysisContext,
    ) -> AnalysisFinding | None:
        if event.event_type not in ("FILE_CREATED", "FILE_MODIFIED"):
            return None

        if not event.file_path or not event.project_root:
            return None

        ext = (event.file_extension or "").lower()
        lang = None
        if ext in (".py",):
            lang = "python"
        elif ext in (".ts", ".tsx"):
            lang = "typescript"
        elif ext in (".js", ".jsx"):
            lang = "javascript"

        if not lang:
            return None

        if os.path.isabs(event.file_path):
            full_path = event.file_path
        else:
            full_path = os.path.join(event.project_root, event.file_path)

        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None

        try:
            with open(full_path, encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except OSError:
            return None

        findings = []
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if not line_stripped:
                continue

            for rule in self.RULES:
                if lang not in rule.languages:
                    continue

                match = rule.pattern.search(line_stripped)
                if match:
                    # Truncate evidence if too long
                    evidence = line_stripped
                    if len(evidence) > 100:
                        evidence = evidence[:97] + "..."

                    findings.append(
                        {
                            "rule_id": rule.id,
                            "title": rule.title,
                            "line_number": i + 1,
                            "symbol": match.group(0),
                            "file": event.file_name or event.file_path or "",
                            "language": lang,
                            "timestamp": event.timestamp.isoformat(),
                            "evidence": evidence,
                            "severity": rule.severity,
                        }
                    )

        if not findings:
            return None

        return AnalysisFinding(
            analyzer_name=self.name,
            analyzer_version=self.version,
            findings={"findings": findings},
        )
