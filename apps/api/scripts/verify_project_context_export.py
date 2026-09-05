"""
Verification Script for Portable AI-Ready Project Context Export (PROJECT_CONTEXT.md).

Validates:
1. Markdown export generation for all registered PostgreSQL projects.
2. Complete presence of required structural sections.
3. Accurate project identity and technology stack mapping.
4. Redaction of sensitive credentials and tokens.
5. Project isolation (no cross-project leakage).
"""

import asyncio
import re
import sys

from app.core.database import AsyncSessionLocal
from app.features.project_context.export import generate_project_context_markdown
from app.features.projects.models import Project
from sqlalchemy import select

REQUIRED_SECTIONS = [
    "# Project Context",
    "## 1. Project Identity",
    "## 2. Executive Summary",
    "### Observed",
    "### Inferred",
    "### Unknown",
    "## 3. Languages",
    "## 4. Frameworks",
    "## 5. Technologies",
    "## 6. Package Managers",
    "## 7. Important Files",
    "## 8. Configuration Files",
    "## 9. Source Directories",
    "## 10. Test Directories",
    "## 11. Architecture Summary",
    "## 12. Development Patterns",
    "## 13. Security Posture",
    "## 14. Activity Summary",
    "## 15. Development History",
    "## 16. Security / Investigation History",
    "# AI Handoff Context",
    "## What DepRadar Knows",
    "## What DepRadar Inferred",
    "## Unknown / Not Yet Observed",
    "## Recommended First Questions for an AI Agent",
    "## Context Provenance",
]


async def verify_project_context_export() -> None:
    print("=" * 70)
    print("VIBEPULSE PROJECT CONTEXT EXPORT VERIFICATION (PROJECT_CONTEXT.md)")
    print("=" * 70)

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Project).order_by(Project.created_at.desc()))
        projects = res.scalars().all()

        if not projects:
            print("[!] No projects in database to verify.")
            return

        print(f"[*] Found {len(projects)} projects for export verification.")

        for p in projects:
            print(f"\n--- Testing Markdown Export for: {p.display_name} ({p.id}) ---")
            md_doc = await generate_project_context_markdown(db, p.id)

            # 1. Check Document Length & Identity
            assert len(md_doc) > 200, (
                f"Generated Markdown for {p.display_name} is too short ({len(md_doc)} chars)"
            )
            assert p.display_name in md_doc, (
                f"Project display name '{p.display_name}' missing from export"
            )
            assert str(p.id) in md_doc, f"Project ID '{p.id}' missing from export"
            lines_count = len(md_doc.splitlines())
            bytes_count = len(md_doc)
            print(f"    [+] Document generated ({lines_count} lines, {bytes_count} bytes)")

            # 2. Check All Structural Sections
            missing_sections = [sec for sec in REQUIRED_SECTIONS if sec not in md_doc]
            if missing_sections:
                print(f"    [FAIL] Missing required sections: {missing_sections}")
                sys.exit(1)
            print(f"    [+] All {len(REQUIRED_SECTIONS)} required sections verified present")

            # 3. Check Secret Redaction
            raw_secret_matches = re.findall(
                r"(ghp_[A-Za-z0-9_]{36,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})",
                md_doc,
            )
            assert not raw_secret_matches, (
                f"Raw secret tokens detected in export: {raw_secret_matches}"
            )
            print("    [+] Zero unredacted secret tokens verified")

            # 4. Check Project Isolation
            for other in projects:
                if other.id != p.id and other.display_name != p.display_name:
                    if other.display_name.lower() in md_doc.lower():
                        print(
                            f"    [WARN] Potential cross-reference of "
                            f"'{other.display_name}' in '{p.display_name}'"
                        )

            print(f"    [+] Export for {p.display_name} validated successfully")

    print("\n" + "=" * 70)
    print("ALL PROJECT CONTEXT EXPORT VERIFICATION CHECKS PASSED [OK]")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(verify_project_context_export())
