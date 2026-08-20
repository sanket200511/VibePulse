import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvidenceProvenance(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: str
    evidence: str
    detection_type: str = "deterministic"


class LanguageDistribution(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    count: int
    percentage: float


class TechnologyDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: str
    provenance: EvidenceProvenance | None = None


class ImportantFileDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    path: str
    reason: str
    activity_count: int
    last_modified: datetime | None = None


class ConfigurationFileDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    path: str
    kind: str


class DevelopmentPatternDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: str
    evidence_count: int
    sample_files: list[str] = Field(default_factory=list)


class SecuritySummaryDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_findings: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    top_rules: list[str] = Field(default_factory=list)


class ActivitySummaryDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_sessions: int = 0
    total_events: int = 0
    first_observed_at: datetime | None = None
    latest_observed_at: datetime | None = None
    frequently_observed_files: list[dict[str, Any]] = Field(default_factory=list)


class GitContextDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    branch: str | None = None
    tracked_branches: list[str] = Field(default_factory=list)


class ArchitectureSummaryDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_type: str = "Standard Workspace"
    source_roots: list[str] = Field(default_factory=list)
    test_roots: list[str] = Field(default_factory=list)
    modules: list[str] = Field(default_factory=list)


class ProjectContextRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_display_name: str
    project_root_path: str

    languages: dict[str, LanguageDistribution] = Field(default_factory=dict)
    frameworks: list[TechnologyDetail] = Field(default_factory=list)
    technologies: list[TechnologyDetail] = Field(default_factory=list)
    package_managers: list[TechnologyDetail] = Field(default_factory=list)
    important_files: list[ImportantFileDetail] = Field(default_factory=list)
    configuration_files: list[ConfigurationFileDetail] = Field(default_factory=list)
    test_directories: list[str] = Field(default_factory=list)
    source_directories: list[str] = Field(default_factory=list)
    git_context: GitContextDetail = Field(default_factory=GitContextDetail)
    development_patterns: list[DevelopmentPatternDetail] = Field(default_factory=list)
    security_summary: SecuritySummaryDetail = Field(default_factory=SecuritySummaryDetail)
    activity_summary: ActivitySummaryDetail = Field(default_factory=ActivitySummaryDetail)
    architecture_summary: ArchitectureSummaryDetail = Field(
        default_factory=ArchitectureSummaryDetail
    )

    context_version: int = 1
    first_observed_at: datetime | None = None
    last_analyzed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
