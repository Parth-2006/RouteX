# RouteX — Mind Map Deliverables

This directory contains the visual and conceptual Mind Map assets for the **RouteX: Analysis of Algorithms** project submission.

## 📁 Included Deliverables

1. **`RouteX_Mind_Map.jpg`**: High-resolution graphic mind map infographic showing the central RouteX hub radiating into the 5 core project pillars (Uninformed Search, Informed Heuristic Search, Mathematical Foundations, Road Network Architecture, and Empirical Benchmarks).
2. **`RouteX_Mind_Map.html`**: A standalone, self-contained interactive web application featuring an interactive zoomable/pannable vector mind map with clickable node details and one-click PDF printing. Double-click or open in any browser (`Chrome`, `Edge`, `Firefox`).
3. **`RouteX_Mind_Map.md`**: Markdown documentation with native Mermaid.js mind map diagram code ready for GitHub, Notion, LaTeX, or project reports.

## 🧠 Mind Map Pillars

- **Uninformed Search**: BFS (FIFO Queue, $\mathcal{O}(V+E)$, Hop-Optimal) & DFS (LIFO Stack, Non-Optimal).
- **Informed Search**: Dijkstra ($\mathcal{O}((V+E)\log V)$, Min-Heap, Distance-Optimal), A* ($f=g+h$, Haversine Heuristic, 40%–70% Pruning), Greedy Best-First ($f=h$, Aggressive).
- **Mathematical Foundations**: Haversine Geodesic Metric, Admissibility Proof ($h(n) \le d^*(n)$), Consistency Proof ($h(u) \le c(u,v) + h(v)$), Asymptotic Big-O Analysis.
- **Road Network Architecture**: 100+ Node Procedural Metropolis, Quadratic Bezier Road Curvature, 9 Bridge Crossings, OSM Extracts (London, Manhattan, Mumbai).
- **Empirical Benchmarks**: Execution latency (ms), node expansion volume, route distance (m), memory consumption, and CSV export.
