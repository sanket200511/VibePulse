# DepRadar — Canonical Knowledge Graph Reference

**Status**: IMPLEMENTATION-VERIFIED GRAPH MODEL
**Source Code**: `apps/api/app/features/knowledge_graph/service.py`, `schemas.py`

---

## 1. Verified Node Types (9 Entities)

| Node Type           | Source Table                   | Label Example                   | Description                           |
| ------------------- | ------------------------------ | ------------------------------- | ------------------------------------- |
| **Project**         | `projects`                     | `Core Banking System`           | Root repository entity                |
| **Subsystem**       | Derived (file path heuristics) | `Authentication`, `Database`    | Architectural subsystem boundary      |
| **Technology**      | `project_contexts`             | `Python`, `TypeScript`          | Programming language / framework      |
| **File**            | `development_events`           | `jwt_service.py`                | Physical source code file             |
| **Session**         | `sessions`                     | `Session 089c2c3e`              | Contiguous developer activity session |
| **SecurityFinding** | `event_analyses`               | `SEC001: Hardcoded Secret`      | AST syntax violation finding          |
| **Incident**        | `event_analyses` + correlation | `inc_sec001`                    | Correlated security incident          |
| **Prediction**      | Pure projection                | `Churn Acceleration`            | Emerging engineering risk forecast    |
| **Priority**        | Pure projection                | `Priority #1: Remediate SEC001` | Ranked actionable recommendation      |

---

## 2. Verified Edge Types (8 Relationships)

| Edge Type           | Source Node Type     | Target Node Type       | Provenance   | Semantics                                         |
| ------------------- | -------------------- | ---------------------- | ------------ | ------------------------------------------------- |
| **CONTAINS**        | `Project`            | `Subsystem`, `Session` | `[OBSERVED]` | Project encompasses subsystem or session          |
| **USED_BY**         | `Technology`         | `Project`              | `[OBSERVED]` | Language/technology is utilized by project        |
| **BELONGS_TO**      | `File`               | `Subsystem`            | `[OBSERVED]` | File resides within architectural subsystem       |
| **ASSOCIATED_WITH** | `File`               | `SecurityFinding`      | `[OBSERVED]` | AST finding detected in file                      |
| **IMPACTS**         | `SecurityFinding`    | `Incident`             | `[INFERRED]` | Finding contributes to correlated incident        |
| **RESOLVED_BY**     | `Incident`           | `IncidentReviewState`  | `[OBSERVED]` | Incident review status updated by reviewer        |
| **FORECASTS**       | `Subsystem` / `File` | `Prediction`           | `[INFERRED]` | Churn drift indicates emerging risk               |
| **PRIORITIZES**     | `Project`            | `Priority`             | `[INFERRED]` | Actionable recommendation prioritized for project |
