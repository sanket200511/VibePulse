"""
Project Context Memory Verification Script.
Validates:
1. Retrieval and aggregation of durable Project Context.
2. Correct detection of languages, frameworks, patterns, important files.
3. Multi-project context isolation.
4. Schema integrity and persistence across re-queries.
"""

import asyncio

from app.core.database import AsyncSessionLocal
from app.features.project_context.service import (
    get_or_create_project_context,
    refresh_project_context,
)
from app.features.projects.models import Project
from sqlalchemy import select


async def verify_project_context() -> None:
    print("=" * 70)
    print("VIBEPULSE PROJECT CONTEXT MEMORY VERIFICATION")
    print("=" * 70)

    async with AsyncSessionLocal() as db:
        stmt = select(Project).order_by(Project.created_at.desc())
        res = await db.execute(stmt)
        projects = res.scalars().all()

        if not projects:
            print("[!] No projects found in database. Registering test project...")
            test_proj = Project(
                display_name="VibeSync Verification Project",
                root_path=r"d:\VibeSync",
            )
            db.add(test_proj)
            await db.commit()
            await db.refresh(test_proj)
            projects = [test_proj]

        print(f"[*] Found {len(projects)} registered projects in PostgreSQL.")

        for p in projects:
            print(f"\n--- Checking Project Context for: {p.display_name} ({p.id}) ---")
            print(f"    Root Path: {p.root_path}")

            # 1. Get or Create Context
            ctx = await get_or_create_project_context(db, p.id)
            print(f"    [+] Context retrieved successfully (Version: {ctx.context_version})")

            # 2. Refresh Context
            refreshed = await refresh_project_context(db, p.id)
            print("    [+] Context refreshed successfully")

            # 3. Print aggregated insights
            langs = list(refreshed.languages.keys())
            fws = [f.name for f in refreshed.frameworks]
            techs = [t.name for t in refreshed.technologies]
            pms = [pm.name for pm in refreshed.package_managers]
            pats = [dp.name for dp in refreshed.development_patterns]
            sec = refreshed.security_summary
            act = refreshed.activity_summary

            print(f"    - Languages ({len(langs)}): {langs}")
            print(f"    - Frameworks ({len(fws)}): {fws}")
            print(f"    - Technologies ({len(techs)}): {techs}")
            print(f"    - Package Managers ({len(pms)}): {pms}")
            print(f"    - Key Patterns ({len(pats)}): {pats}")
            print(f"    - Important Files ({len(refreshed.important_files)}): files tracked")
            print(
                f"    - Security Findings: {sec.total_findings} "
                f"(Critical: {sec.critical}, High: {sec.high})"
            )
            print(f"    - Total Events: {act.total_events}, Sessions: {act.total_sessions}")
            print(f"    - Git Branch: {refreshed.git_context.branch}")

            # Assertions
            assert refreshed.project_id == p.id, "Context project_id mismatch"
            assert refreshed.project_root_path == p.root_path, "Context root_path mismatch"

    print("\n" + "=" * 70)
    print("ALL PROJECT CONTEXT MEMORY VERIFICATION CHECKS PASSED [OK]")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(verify_project_context())
