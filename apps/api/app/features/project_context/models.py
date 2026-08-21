import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProjectContext(Base):
    """
    Durable Project Context Memory.
    Stores progressively aggregated, evidence-backed knowledge about an observed
    software project across sessions and restarts.
    """

    __tablename__ = "project_contexts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    languages: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    frameworks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    technologies: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    package_managers: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    important_files: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    configuration_files: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    test_directories: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    source_directories: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    git_context: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    development_patterns: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    security_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    activity_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    architecture_summary: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )

    context_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    first_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_analyzed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )

    project = relationship("Project", backref="context")
