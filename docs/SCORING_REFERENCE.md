# VibePulse — Canonical Scoring & Mathematical Reference

**Status**: IMPLEMENTATION-VERIFIED MATHEMATICAL REFERENCE  
**Source Code**: `apps/api/app/features/project_health/service.py`, `security_intelligence/service.py`, `predictive_intelligence/service.py`

---

## 1. Unified Project Health Model ($0 \dots 100$)

The Unified Health Score is a deterministic weighted linear composite of 5 discrete dimensions:

$$\text{Overall Health} = \text{round}\left( 0.25 S_{\text{sec}} + 0.20 S_{\text{eng}} + 0.20 S_{\text{inc}} + 0.15 S_{\text{res}} + 0.20 S_{\text{pred}} \right)$$

Clamped to $[0, 100]$.

### Grade Classification
- **EXCELLENT**: $\text{Score} \ge 90$
- **HEALTHY**: $75 \le \text{Score} < 90$
- **NEEDS_ATTENTION**: $60 \le \text{Score} < 75$
- **DEGRADED**: $40 \le \text{Score} < 60$
- **CRITICAL**: $\text{Score} < 40$
- **INSUFFICIENT_EVIDENCE**: Assigned when historical telemetry is insufficient to establish baseline.

---

## 2. Five Health Dimensions

### Dimension 1: Security Health ($S_{\text{sec}}$, Weight $= 0.25$)
- **Source**: Inverted Security Risk Score ($R_{\text{sec}}$) computed from unmitigated AST findings.
- **Formula**:
  $$S_{\text{sec}} = \max\left(0, \min(100, 100 - R_{\text{sec}})\right)$$

### Dimension 2: Engineering Stability ($S_{\text{eng}}$, Weight $= 0.20$)
- **Source**: Historical session continuity, language ecosystem fragmentation, and event velocity bursts.
- **Formula**:
  $$\text{Base} = 100$$
  $$\text{Penalty}_{\text{burst}} = 10 \quad \text{if recent events in last 3 sessions} > 50 \text{ else } 0$$
  $$\text{Penalty}_{\text{fragmentation}} = 5 \quad \text{if active languages} > 3 \text{ else } 0$$
  $$S_{\text{eng}} = \max\left(40, \min(100, 100 - \text{Penalty}_{\text{burst}} - \text{Penalty}_{\text{fragmentation}})\right)$$

### Dimension 3: Incident Health ($S_{\text{inc}}$, Weight $= 0.20$)
- **Source**: Active unmitigated incident severity and backlog volume.
- **Formula**:
  $$\text{Penalty}_{\text{inc}} = (30 \times N_{\text{crit\_findings}}) + (15 \times N_{\text{high\_findings}}) + (10 \times N_{\text{open\_incidents}})$$
  $$S_{\text{inc}} = \max\left(0, \min(100, 100 - \text{Penalty}_{\text{inc}})\right)$$

### Dimension 4: Resolution Health ($S_{\text{res}}$, Weight $= 0.15$)
- **Source**: Incident triage resolution rate ($R_{\text{res}}$) and active resolution regression penalty ($P_{\text{reg}}$).
- **Formula**:
  $$R_{\text{res}} = \frac{N_{\text{resolved}}}{N_{\text{open}} + N_{\text{resolved}}} \times 100 \quad (\text{defaults to } 100\% \text{ if no incidents})$$
  $$P_{\text{reg}} = 35 \quad \text{if active RESOLUTION\_REGRESSION signal present, else } 0$$
  $$S_{\text{res}} = \max\left(0, \min(100, \text{int}(0.6 \times R_{\text{res}} + 0.4 \times (100 - P_{\text{reg}})))\right)$$

### Dimension 5: Predictive Risk Health ($S_{\text{pred}}$, Weight $= 0.20$)
- **Source**: Highest empirical forecast signal risk score ($F_{\max}$) and hotspot concentration.
- **Formula**:
  $$\text{Penalty}_{\text{hotspots}} = \min(30, 10 \times N_{\text{hotspots}})$$
  $$S_{\text{pred}} = \max\left(0, \min(100, 100 - \text{int}(0.7 \times F_{\max} + \text{Penalty}_{\text{hotspots}}))\right)$$

---

## 3. Security Risk Score ($R_{\text{sec}}$, Higher = Worse)

- Additive point total based on AST rule violations:
  - **CRITICAL** finding (e.g. exposed live credential `SEC001`): $+35 \dots 50$ points
  - **HIGH** finding (e.g. `DEBUG_TRUE` in production settings): $+20 \dots 30$ points
  - **MEDIUM** finding: $+10 \dots 15$ points
  - **LOW** finding: $+5$ points

---

## 4. Forecast Strength ($0 \dots 100$, Empirical Confidence)

- Calculated from historical time-series telemetry volume ($N_{\text{events}}$) and session continuity ($N_{\text{sessions}}$):
  $$\text{Strength} = \min(100, (N_{\text{sessions}} \times 20) + \min(50, N_{\text{events}}))$$
- Minimum threshold: If telemetry is below the baseline, signals return status `INSUFFICIENT_EVIDENCE`.
