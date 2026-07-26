"""create_projects_and_link_sessions

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-25

"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create `projects` table
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("root_path", sa.String(length=1024), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_root_path"), "projects", ["root_path"], unique=True)

    # 2. Add `project_id` to `sessions` table
    op.add_column(
        "sessions",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # 3. Data migration: backfill projects from existing sessions
    bind = op.get_bind()
    session_roots = bind.execute(sa.text("SELECT DISTINCT project_root FROM sessions")).fetchall()

    for row in session_roots:
        root_path = row[0]
        # Very simple normalization: trim trailing slashes
        normalized_path = root_path.rstrip("/\\")

        # Derive display name from basename
        # Handle both Windows and Unix path separators
        parts = normalized_path.replace("\\", "/").split("/")
        display_name = parts[-1] if parts else "Unknown Project"

        project_id = uuid.uuid4()

        # Insert project
        bind.execute(
            sa.text(
                """
                INSERT INTO projects (id, root_path, display_name, created_at, updated_at)
                VALUES (:id, :root_path, :display_name, now(), now())
                ON CONFLICT (root_path) DO NOTHING
                """
            ),
            {"id": project_id, "root_path": normalized_path, "display_name": display_name},
        )

        # Ensure we have the actual ID in case ON CONFLICT triggered
        actual_project_id_row = bind.execute(
            sa.text("SELECT id FROM projects WHERE root_path = :root_path"),
            {"root_path": normalized_path},
        ).fetchone()

        if actual_project_id_row:
            actual_project_id = actual_project_id_row[0]
            # Update matching sessions
            bind.execute(
                sa.text(
                    "UPDATE sessions SET project_id = :project_id WHERE project_root = :old_root"
                ),
                {"project_id": actual_project_id, "old_root": root_path},
            )


def downgrade() -> None:
    op.drop_column("sessions", "project_id")
    op.drop_index(op.f("ix_projects_root_path"), table_name="projects")
    op.drop_table("projects")
