import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any

from app.core.domain.events import AnalyzableEvent
from app.features.engineering_dna.schemas import BiographyEntry, EngineeringDNARead


def _format_age(created_at: datetime | None, last_seen: datetime | None) -> str:
    if not created_at or not last_seen:
        return "Unknown"

    diff = last_seen - created_at
    total_seconds = diff.total_seconds()

    if total_seconds < 60:
        return "Just born"
    elif total_seconds < 3600:
        minutes = int(total_seconds // 60)
        return f"{minutes} min{'s' if minutes != 1 else ''}"
    elif total_seconds < 86400:
        hours = int(total_seconds // 3600)
        return f"{hours} hour{'s' if hours != 1 else ''}"
    else:
        days = int(total_seconds // 86400)
        return f"{days} day{'s' if days != 1 else ''}"


def build_engineering_dna(
    file_path: str,
    events: list[AnalyzableEvent],
    analyses: dict[uuid.UUID, dict[str, dict[str, Any]]],
) -> EngineeringDNARead:

    events_sorted = sorted(events, key=lambda e: e.timestamp)

    created_at = events_sorted[0].timestamp if events_sorted else None
    last_seen = events_sorted[-1].timestamp if events_sorted else None

    sessions_seen = set()
    events_count = len(events_sorted)

    functions_created = 0
    functions_removed = 0
    classes_created = 0
    classes_removed = 0
    imports_added = 0
    imports_removed = 0
    security_findings = 0
    todos_created = 0
    todos_resolved = 0
    major_refactors = 0
    rename_events = 0

    session_event_counts = defaultdict(int)

    biography = []

    if events_sorted:
        biography.append(
            BiographyEntry(
                timestamp=events_sorted[0].timestamp,
                event_id=events_sorted[0].id,
                session_id=events_sorted[0].session_id,
                finding="File Created / First Observed",
            )
        )

    for event in events_sorted:
        sessions_seen.add(event.session_id)
        session_event_counts[event.session_id] += 1

        event_analyses = analyses.get(event.id, {})

        if event.event_type == "rename":
            rename_events += 1
            biography.append(
                BiographyEntry(
                    timestamp=event.timestamp,
                    event_id=event.id,
                    session_id=event.session_id,
                    finding="File Renamed",
                )
            )

        evolution = event_analyses.get("code_evolution", {})
        observations = evolution.get("observations", [])

        for obs in observations:
            kind = obs.get("kind", "")
            symbol = obs.get("symbol", "")
            finding_text = f"{kind}: {symbol}"

            if kind == "FUNCTION_ADDED":
                functions_created += 1
                finding_text = f"Function Added: {symbol}"
            elif kind == "FUNCTION_REMOVED":
                functions_removed += 1
                finding_text = f"Function Removed: {symbol}"
            elif kind == "CLASS_ADDED":
                classes_created += 1
                finding_text = f"Class Added: {symbol}"
            elif kind == "CLASS_REMOVED":
                classes_removed += 1
                finding_text = f"Class Removed: {symbol}"
            elif kind == "IMPORT_ADDED":
                imports_added += 1
                finding_text = f"Import Added: {symbol}"
            elif kind == "IMPORT_REMOVED":
                imports_removed += 1
                finding_text = f"Import Removed: {symbol}"
            elif kind == "TODO_INTRODUCED":
                todos_created += 1
                finding_text = f"TODO Added: {symbol}"
            elif kind == "TODO_RESOLVED":
                todos_resolved += 1
                finding_text = f"TODO Resolved: {symbol}"
            elif kind in ["FUNCTION_REFACTORED", "CLASS_REFACTORED"]:
                major_refactors += 1
                finding_text = f"Refactored: {symbol}"

            biography.append(
                BiographyEntry(
                    timestamp=event.timestamp,
                    event_id=event.id,
                    session_id=event.session_id,
                    finding=finding_text,
                )
            )

        security = event_analyses.get("security_guardian", {})
        findings = security.get("findings", [])
        for f in findings:
            security_findings += 1
            title = f.get("title", "Security Finding")
            biography.append(
                BiographyEntry(
                    timestamp=event.timestamp,
                    event_id=event.id,
                    session_id=event.session_id,
                    finding=title,
                )
            )

    largest_session = None
    if session_event_counts:
        largest_session = max(session_event_counts.items(), key=lambda x: x[1])[0]

    first_authoring_session = events_sorted[0].session_id if events_sorted else None
    latest_authoring_session = events_sorted[-1].session_id if events_sorted else None

    # De-duplicate biography entries that might occur in the same millisecond or from same analyzer
    # Though we want all milestones, sometimes one event yields multiple.

    # We will just sort them stably.
    biography.sort(key=lambda x: x.timestamp)

    if events_sorted:
        biography.append(
            BiographyEntry(
                timestamp=events_sorted[-1].timestamp,
                event_id=events_sorted[-1].id,
                session_id=events_sorted[-1].session_id,
                finding="Current State",
            )
        )

    return EngineeringDNARead(
        identity=file_path.split("/")[-1] if "/" in file_path else file_path,
        path=file_path,
        created_at=created_at,
        last_seen=last_seen,
        observed_sessions=len(sessions_seen),
        observed_events=events_count,
        functions_created=functions_created,
        functions_removed=functions_removed,
        classes_created=classes_created,
        classes_removed=classes_removed,
        imports_added=imports_added,
        imports_removed=imports_removed,
        security_findings=security_findings,
        todos_created=todos_created,
        todos_resolved=todos_resolved,
        major_refactors=major_refactors,
        rename_events=rename_events,
        largest_session=largest_session,
        first_authoring_session=first_authoring_session,
        latest_authoring_session=latest_authoring_session,
        age=_format_age(created_at, last_seen),
        biography=biography,
    )
