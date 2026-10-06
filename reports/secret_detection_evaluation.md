# Secret & Credential Leak Detection Evaluation Report

**Generated:** 2026-09-05T09:44:23Z  
**Test Corpus Size:** 55 samples (grouped repository split)

## 1. Comparative Performance Summary

| Model / Configuration                  | Status          | Precision | Recall | F1 Score | FPR    | FNR    | Avg Latency (ms) |
| -------------------------------------- | --------------- | --------- | ------ | -------- | ------ | ------ | ---------------- |
| **Deterministic Baseline (Regex/AST)** | `EVALUATED`     | 0.6667    | 0.5263 | 0.5882   | 0.1389 | 0.4737 | 0.00 ms          |
| **Classical ML (Random Forest)**       | `EVALUATED`     | 1.0000    | 1.0000 | 1.0000   | 0.0000 | 0.0000 | 6.74 ms          |
| **Contextual CodeBERT (Adapter)**      | `NOT_AVAILABLE` | N/A       | N/A    | N/A      | N/A    | N/A    | N/A              |
| **Hybrid Engine (Deterministic + ML)** | `EVALUATED`     | 1.0000    | 1.0000 | 1.0000   | 0.0000 | 0.0000 | 5.98 ms          |

## 2. False Positive Breakdown by Category

| Category        | Deterministic Baseline | Classical ML | Hybrid Engine |
| --------------- | ---------------------- | ------------ | ------------- |
| `placeholder`   | 4                      | 0            | 0             |
| `documentation` | 0                      | 0            | 0             |
| `test_fixture`  | 0                      | 0            | 0             |
| `hash`          | 0                      | 0            | 0             |
| `UUID`          | 0                      | 0            | 0             |
| `URL`           | 0                      | 0            | 0             |
| `configuration` | 0                      | 0            | 0             |
| `other`         | 1                      | 0            | 0             |

## 3. Confusion Matrices

### Deterministic Baseline (Regex/AST)

```json
{
  "REAL_SECRET": {
    "REAL_SECRET": 10,
    "PLACEHOLDER_OR_EXAMPLE": 0,
    "NOT_SECRET": 9
  },
  "PLACEHOLDER_OR_EXAMPLE": {
    "REAL_SECRET": 5,
    "PLACEHOLDER_OR_EXAMPLE": 6,
    "NOT_SECRET": 7
  },
  "NOT_SECRET": {
    "REAL_SECRET": 0,
    "PLACEHOLDER_OR_EXAMPLE": 0,
    "NOT_SECRET": 18
  }
}
```

### Classical ML (Random Forest)

```json
{
  "REAL_SECRET": {
    "REAL_SECRET": 19,
    "PLACEHOLDER_OR_EXAMPLE": 0,
    "NOT_SECRET": 0
  },
  "PLACEHOLDER_OR_EXAMPLE": {
    "REAL_SECRET": 0,
    "PLACEHOLDER_OR_EXAMPLE": 18,
    "NOT_SECRET": 0
  },
  "NOT_SECRET": {
    "REAL_SECRET": 0,
    "PLACEHOLDER_OR_EXAMPLE": 0,
    "NOT_SECRET": 18
  }
}
```

### Hybrid Engine (Deterministic + ML)

```json
{
  "REAL_SECRET": {
    "REAL_SECRET": 19,
    "PLACEHOLDER_OR_EXAMPLE": 0,
    "NOT_SECRET": 0
  },
  "PLACEHOLDER_OR_EXAMPLE": {
    "REAL_SECRET": 0,
    "PLACEHOLDER_OR_EXAMPLE": 18,
    "NOT_SECRET": 0
  },
  "NOT_SECRET": {
    "REAL_SECRET": 0,
    "PLACEHOLDER_OR_EXAMPLE": 0,
    "NOT_SECRET": 18
  }
}
```
