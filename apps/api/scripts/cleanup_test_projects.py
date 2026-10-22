"""
VibePulse Safe Project Cleanup Script.

Removes stale/test project database records while protecting seminar demo
and active projects. Does NOT delete physical filesystem directories.

Usage:
  # Dry-run (default, no changes made)
  uv run python scripts/cleanup_test_projects.py

  # Confirm deletion of identified test records
  uv run python scripts/cleanup_test_projects.py --confirm
"""

import argparse
import asyncio
from typing import NamedTuple

from app.core.database import AsyncSessionLocal
from app.features.analysis.models import EventAnalysis
from app.features.events.models import DevelopmentEvent
from app.features.project_context.models import ProjectContext
from app.features.projects.models import Project
from app.features.sessions.models import Session
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

# Explicitly Protected Seminar Projects
PROTECTED_PROJECT_NAMES = {
    "VibePulse-Demo",
    "Alpha-Service",
    "Beta-Analytics",
    "VibeSync",
    "VibePulse",
}

PROTECTED_PROJECT_ROOTS = {
    r"d:\vibepulse-demo",
    r"d:\demo-projects\alpha-service",
    r"d:\demo-projects\beta-analytics",
    r"d:\vibesync",
}


class CandidateProject(NamedTuple):
    project: Project
    reason: str
    session_count: int
    event_count: int
    has_active_session: bool


def is_protected(project: Project) -> bool:
    norm_name = (project.display_name or "").strip()
    norm_root = (project.root_path or "").strip().lower().replace("/", "\\")

    if norm_name in PROTECTED_PROJECT_NAMES:
        return True
    if any(norm_root.startswith(prot_root) for prot_root in PROTECTED_PROJECT_ROOTS):
        return True
    return False


def get_cleanup_reason(project: Project, event_count: int) -> str | None:
    norm_root = (project.root_path or "").strip().lower().replace("/", "\\")
    norm_name = (project.display_name or "").strip()

    # 1. Stale POSIX dummy roots from prior pytest runs
    if norm_root.startswith("\\home\\dev\\vibepulse-") or norm_root.startswith("/home/dev/"):
        return "stale generated test registration (synthetic /home/dev root)"

    # 2. Ephemeral test project roots
    if "\\test-projects\\" in norm_root or norm_root.startswith("d:\\test-projects"):
        return "ephemeral automated test root"

    # 3. Empty synthetic UUID project names with 0 events
    if norm_name.startswith("vibepulse-") and len(norm_name) > 36 and event_count == 0:
        return "orphaned synthetic test registration with 0 events"

    return None


async def scan_projects(db: AsyncSession) -> tuple[list[CandidateProject], list[Project]]:
    stmt = select(Project).order_by(Project.created_at.asc())
    res = await db.execute(stmt)
    all_projects = res.scalars().all()

    candidates: list[CandidateProject] = []
    protected: list[Project] = []

    for p in all_projects:
        s_count_stmt = select(func.count(Session.id)).where(Session.project_id == p.id)
        s_count = (await db.execute(s_count_stmt)).scalar() or 0

        active_stmt = select(func.count(Session.id)).where(
            Session.project_id == p.id, Session.status == "ACTIVE"
        )
        active_count = (await db.execute(active_stmt)).scalar() or 0
        has_active = active_count > 0

        e_count_stmt = select(func.count(DevelopmentEvent.id)).where(
            DevelopmentEvent.project_root == p.root_path
        )
        e_count = (await db.execute(e_count_stmt)).scalar() or 0

        if is_protected(p):
            protected.append(p)
            continue

        reason = get_cleanup_reason(p, e_count)
        if reason:
            candidates.append(
                CandidateProject(
                    project=p,
                    reason=reason,
                    session_count=s_count,
                    event_count=e_count,
                    has_active_session=has_active,
                )
            )
        else:
            protected.append(p)

    return candidates, protected


async def delete_project_records(db: AsyncSession, project: Project) -> dict[str, int]:
    """
    Safely delete all associated database records for a project in a single transaction.
    Does NOT touch any filesystem directories.
    """
    # Find all event IDs for this project root
    events_stmt = select(DevelopmentEvent.id).where(
        DevelopmentEvent.project_root == project.root_path
    )
    event_ids = (await db.execute(events_stmt)).scalars().all()

    analyses_deleted = 0
    events_deleted = 0
    if event_ids:
        del_analyses = delete(EventAnalysis).where(EventAnalysis.event_id.in_(event_ids))
        res_a = await db.execute(del_analyses)
        analyses_deleted = res_a.rowcount or 0

        del_events = delete(DevelopmentEvent).where(DevelopmentEvent.id.in_(event_ids))
        res_e = await db.execute(del_events)
        events_deleted = res_e.rowcount or 0

    # Delete project context
    del_ctx = delete(ProjectContext).where(ProjectContext.project_id == project.id)
    res_ctx = await db.execute(del_ctx)
    ctx_deleted = res_ctx.rowcount or 0

    # Delete sessions (cascades or explicit)
    del_sess = delete(Session).where(Session.project_id == project.id)
    res_s = await db.execute(del_sess)
    sess_deleted = res_s.rowcount or 0

    # Delete project
    del_proj = delete(Project).where(Project.id == project.id)
    await db.execute(del_proj)

    await db.commit()

    return {
        "events": events_deleted,
        "analyses": analyses_deleted,
        "contexts": ctx_deleted,
        "sessions": sess_deleted,
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="VibePulse Project Cleanup Utility")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Execute database record deletion. Without this flag, runs in dry-run mode.",
    )
    args = parser.parse_args()

    async with AsyncSessionLocal() as db:
        candidates, protected = await scan_projects(db)

        if not args.confirm:
            print("==================================================")
            print("VibePulse Project Cleanup -- DRY RUN")
            print("==================================================")
            print()
            if not candidates:
                print("No stale test projects detected for removal.")
            else:
                print(f"Projects detected for removal ({len(candidates)} total):")
                print()
                for idx, item in enumerate(candidates, 1):
                    p = item.project
                    print(f"{idx}. {p.display_name}")
                    print(f"   id:     {p.id}")
                    print(f"   root:   {p.root_path}")
                    print(f"   reason: {item.reason}")
                    if item.has_active_session:
                        print("   [!] Project is currently active and cannot be removed.")
                    print()

            print("Protected projects:")
            print()
            for p in protected:
                print(f"  [PROTECTED] {p.display_name} ({p.root_path})")
            print()
            print("No database records have been deleted.")
            print("Run with --confirm to perform cleanup.")
            print("==================================================")
            return

        # CONFIRMED CLEANUP MODE
        print("==================================================")
        print("VibePulse Project Cleanup -- EXECUTING DELETION")
        print("==================================================")
        print()

        deleted_count = 0
        for item in candidates:
            p = item.project
            if item.has_active_session:
                print(f"[SKIP] {p.display_name}: Project is active and cannot be removed.")
                continue

            print(f"Deleting records for: {p.display_name} ({p.id})...")
            stats = await delete_project_records(db, p)
            print(
                f"  -> Removed {stats['sessions']} sessions, {stats['events']} events, "
                f"{stats['analyses']} analyses, {stats['contexts']} contexts."
            )
            deleted_count += 1

        print()
        print(f"Cleanup complete. Successfully removed {deleted_count} stale test projects.")
        print()
        print("Remaining Active & Protected Projects:")
        # Rescan remaining
        _, remaining = await scan_projects(db)
        for p in remaining:
            print(f"  [KEPT] {p.display_name} ({p.root_path})")
        print("==================================================")


if __name__ == "__main__":
    asyncio.run(main())
