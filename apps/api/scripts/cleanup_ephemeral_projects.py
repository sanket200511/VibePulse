"""
VibePulse Ephemeral Project Cleanup Script (SQLAlchemy / Python backend)

Safely inspects and removes ephemeral/test/demo projects directly from PostgreSQL
while strictly protecting legitimate persistent workspaces (e.g. D:\\Projects\\Dabba).
"""

import asyncio
import sys

from app.core.database import AsyncSessionLocal
from app.features.projects.models import Project
from app.features.projects.service import delete_project
from sqlalchemy import select


def classify_project(root_path: str | None, display_name: str | None) -> str:
    root = (root_path or "").replace("\\", "/").lower()
    name = (display_name or "").lower()

    if root == "d:/projects/dabba" or root.endswith("/projects/dabba") or name == "dabba":
        return "PERSISTENT"

    ephemeral_tokens = [
        "appdata/local/temp",
        "/tmp/",  # noqa: S108
        "/home/dev",
        "test-projects",
        "demo-projects",
        "vibepulse-demo",
        "vibepulse-seminar-demo",
        "vibepulse-observation-test",
        "vibepulse-seminar-secondary",
        "vibepulse-sec",
        "vibepulse-copilot",
        "vp-kg-proj",
        "vp-res-proj",
        "vp-s12-proj",
        "vp-sec-audit",
        "vp-recon-audit",
        "vp-bench",
        "reconstructible-",
        "safe_delete_",
        "cascade_",
    ]

    for tok in ephemeral_tokens:
        if tok in root or tok in name:
            return "EPHEMERAL_CONFIRMED"

    return "UNKNOWN"


async def main() -> None:
    is_confirm = "--confirm" in sys.argv

    print("=" * 80)
    if is_confirm:
        print("     VIBEPULSE EPHEMERAL PROJECT CLEANUP - CONTROLLED EXECUTION     ")
    else:
        print("        VIBEPULSE EPHEMERAL PROJECT CLEANUP - DRY RUN               ")
    print("=" * 80 + "\n")

    async with AsyncSessionLocal() as db:
        stmt = select(Project).order_by(Project.created_at.desc())
        projects = list((await db.execute(stmt)).scalars().all())

        print(f"Total projects in database: {len(projects)}\n")

        persistent = []
        ephemeral = []
        unknown = []

        for p in projects:
            cls = classify_project(p.root_path, p.display_name)
            if cls == "PERSISTENT":
                persistent.append(p)
            elif cls == "EPHEMERAL_CONFIRMED":
                ephemeral.append(p)
            else:
                unknown.append(p)

        print("Classifications:")
        print(f"  - PERSISTENT (strictly protected)  : {len(persistent)}")
        print(f"  - EPHEMERAL_CONFIRMED (disposable) : {len(ephemeral)}")
        print(f"  - UNKNOWN (held for review)        : {len(unknown)}\n")

        print("-" * 80)
        print("PERSISTENT PROJECTS PROTECTED (Will NEVER be modified or deleted):")
        for p in persistent:
            print(f"  [OK] {p.id} | {p.display_name} | Root: {p.root_path}")
        print("-" * 80 + "\n")

        if unknown:
            print("UNKNOWN PROJECTS (Held for review, will NOT be deleted):")
            for p in unknown:
                print(f"  [?] {p.id} | {p.display_name} | Root: {p.root_path}")
            print("-" * 80 + "\n")

        if not is_confirm:
            print("CANDIDATES FOR CLEANUP (Sample of first 10 ephemeral projects):")
            for p in ephemeral[:10]:
                print(f"  [-] {p.id} | {p.display_name} | Root: {p.root_path}")
            if len(ephemeral) > 10:
                print(f"  ... and {len(ephemeral) - 10} more disposable projects.\n")

            print("=" * 80)
            print("DRY RUN COMPLETE - Zero records modified.")
            print("To execute deletion of confirmed ephemeral projects, run:")
            print("  pnpm cleanup:ephemeral:confirm")
            print("=" * 80)
            return

        # Controlled Execution
        print(f"Initiating controlled cascade deletion of {len(ephemeral)} ephemeral projects...\n")
        deleted_count = 0
        failed_count = 0

        for idx, p in enumerate(ephemeral):
            try:
                res = await delete_project(db, p.id, force=True)
                if res and res.get("deleted"):
                    deleted_count += 1
                if (idx + 1) % 25 == 0 or idx + 1 == len(ephemeral):
                    print(f"  Progress: {idx + 1}/{len(ephemeral)} deleted...")
            except Exception as e:
                failed_count += 1
                print(f"  [!] Failed to delete project {p.id}: {e}", file=sys.stderr)

        print("\n" + "=" * 80)
        print("CLEANUP EXECUTION COMPLETE")
        print(f"  - Ephemeral projects deleted: {deleted_count}")
        print(f"  - Deletion failures:          {failed_count}")
        print(f"  - Persistent projects intact: {len(persistent)}")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
