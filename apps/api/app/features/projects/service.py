import uuid

from app.features.projects.models import Project
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_create_project(db: AsyncSession, root_path: str) -> Project:
    """
    Ensure a canonical Project exists for a given filesystem root.
    Uses basic path normalization to prevent trivial duplicate identities.
    """
    normalized_path = root_path.rstrip("/\\")

    # Check if exists
    result = await db.execute(select(Project).where(Project.root_path == normalized_path))
    project = result.scalar_one_or_none()

    if project:
        return project

    # Derive display name from basename
    parts = normalized_path.replace("\\", "/").split("/")
    display_name = parts[-1] if parts else "Unknown Project"

    # Create new
    project = Project(
        id=uuid.uuid4(),
        root_path=normalized_path,
        display_name=display_name,
    )
    db.add(project)
    await db.flush()
    return project
