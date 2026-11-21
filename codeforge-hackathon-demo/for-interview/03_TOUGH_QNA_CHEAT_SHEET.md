# 🧠 03. Tough Technical Interview Questions & Cheat Sheet

Use this cheat sheet to confidently answer difficult architecture, algorithm, performance, and graph engineering questions.

---

## ❓ Question 1: How did you solve graph clutter when rendering 100+ entities?

**Answer**:

> "Traditional force-directed algorithms (like D3-force) create chaotic, overlapping node clusters. I designed an **Anchor-Centered Radial Causal Coordinate System** combined with **BFS Neighborhood Isolation**.
> Instead of displaying all 100 nodes at once, the system anchors on the selected entity at $(0,0)$, isolates the $k$-hop neighborhood (defaulting to 1-hop focus), and arranges upstream causes on the left ($X < 0$), downstream impacts on the right ($X > 0$), and context laterally. Nodes in the same column are spaced with symmetric $Y$ bounds, guaranteeing zero overlap and 80% canvas utilization."

---

## ❓ Question 2: How do you prevent race conditions when streaming real-time file telemetry from the daemon?

**Answer**:

> "The daemon uses a debounced buffer queue backed by Chokidar file events. When rapid file modifications occur (e.g. typing or auto-formatting), events within a 250ms window are coalesced. The publisher maintains a sequence-ordered Queue worker that sends events to FastAPI via POST over persistent HTTP connections, while FastAPI executes atomic upserts (`INSERT ... ON CONFLICT DO UPDATE`) inside SQLAlchemy 2.0 async transactions."

---

## ❓ Question 3: How does your graph engine guarantee deterministic, non-hallucinated causality?

**Answer**:

> "Every node and edge in our graph has an immutable `provenance` property (`OBSERVED` vs `INFERRED`) and an `evidence_references` JSON array containing raw AST diff tokens, static analysis rule IDs, or commit hashes. When a user clicks 'Why this connection?', the inspector renders the grounded source proof directly from PostgreSQL."

---

## ❓ Question 4: How does the SVG canvas achieve smooth 60fps pan/zoom and YouTube-like fullscreen?

**Answer**:

> "Instead of re-rendering heavy React DOM nodes, the canvas transforms an `<svg>` element using CSS Hardware-Accelerated matrix transforms `transform: translate(panX, panY) scale(zoom)`. Mouse wheel zoom calculates cursor-relative translation deltas:
> $x_{\text{pan}}' = x_{\text{cursor}} - (x_{\text{cursor}} - x_{\text{pan}}) \cdot \frac{z_{\text{new}}}{z_{\text{old}}}$,
> keeping the point under the mouse perfectly stationary."

---

## ❓ Question 5: How does your Bayesian model predict project health degradation?

**Answer**:

> "The predictive engine calculates failure probability $P = 1 - \prod (1 - w_i \cdot \text{Severity}(F_i))$ based on unmitigated static analysis findings and code churn metrics. As security findings or high-churn events accumulate, the predicted risk deducts weighted points from the 5 health dimensions (Security, Quality, Delivery, Architecture, Maintainability)."
