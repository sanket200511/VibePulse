# 🔬 VibePulse — Technical Deep Dive

This document delves into the advanced engineering mechanisms powering VibePulse: graph algorithms, AST static analysis, Bayesian prediction models, and dynamic SVG rendering.

---

## 🕸️ 1. Correlation & Causality Graph Engine

### Focused Radial-Causal Neighborhood Layout

Traditional force-directed graph layouts (e.g. D3-force) suffer from node overlap, unpredictable jitter, and poor visual clarity. VibePulse implements a custom **Anchor-Centered Radial Causal Coordinate System**:

$$ \text{Position}(N_i) = \begin{cases}
(0, 0) & \text{if } N_i = \text{Anchor} \\
(-d \cdot 220, Y_{\text{start}} + k \cdot 82) & \text{if } N_i \text{ is Upstream Cause at hop } d \\
(+d \cdot 220, Y_{\text{start}} + k \cdot 82) & \text{if } N_i \text{ is Downstream Impact at hop } d \\
(x_{\text{lat}}, \pm 110) & \text{if } N_i \text{ is Context (Subsystem/Tech)}
\end{cases}$$

- **Upstream Causes** ($X < 0$): Developer activity, AST edits, Git commits, and Root Causes flow left-to-right into the target node.
- **Downstream Impact** ($X > 0$): Resulting incidents, degraded health metrics, and predicted future failures flow rightward.
- **Symmetric Y-Distribution**: Prevents vertical collisions by calculating $Y_{\text{start}} = -((N_{\text{col}} - 1) \cdot 82) / 2$.

---

## 🎯 2. Dynamic BFS Neighborhood Isolation & Depth Control

When visualizing large codebases (100+ entities), displaying every node causes cognitive overload. VibePulse applies **Breadth-First Search (BFS) Neighborhood Isolation**:

```typescript
// BFS neighborhood collection up to maxDepth
const reached = new Set<string>([activeAnchorId]);
let frontier = new Set<string>([activeAnchorId]);

for (let d = 0; d < focusDepth; d++) {
  const nextFrontier = new Set<string>();
  edges.forEach((e) => {
    if (frontier.has(e.source_node_id) && !reached.has(e.target_node_id)) {
      reached.add(e.target_node_id);
      nextFrontier.add(e.target_node_id);
    }
    if (frontier.has(e.target_node_id) && !reached.has(e.source_node_id)) {
      reached.add(e.source_node_id);
      nextFrontier.add(e.source_node_id);
    }
  });
  frontier = nextFrontier;
}
```

---

## 📊 3. Bayesian Predictive Risk Model

VibePulse predicts project failure probability $P(\text{Incident} \mid \text{Telemetry})$ using a multi-factor Bayesian model:

$$P(\text{Incident}) = 1 - \prod_{i=1}^{m} \left(1 - w_i \cdot \text{Severity}(F_i)\right)$$

Where:
- $F_i$ represents active unmitigated security findings or high-churn AST diffs.
- $w_i$ is the empirical weight assigned to rule severity:
  - `CRITICAL` ($w = 0.45$, risk $+15$ pts)
  - `HIGH` ($w = 0.25$, risk $+10$ pts)
  - `MEDIUM` ($w = 0.10$, risk $+5$ pts)

The predicted risk directly updates health scores across 5 core dimensions:
- **Security Health**: $H_{\text{sec}} = 100 - \sum \text{RiskPoints}$
- **Overall Project Score**: $\bar{H} = \frac{1}{5} \sum_{d=1}^{5} H_d$

---

## 🔍 4. Edge Routing & Bezier Anti-Collision

Edges are rendered using cubic Bezier curves with horizontal control points to maintain clean visual flow:

$$C(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3$$

Where control points $P_1 = (x_0 + \max(40, \Delta x \cdot 0.45), y_0)$ and $P_2 = (x_1 - \max(40, \Delta x \cdot 0.45), y_1)$ force smooth horizontal entry/exit without harsh line crossings.
$$
