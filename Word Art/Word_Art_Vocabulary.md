# RouteX — Word Art Vocabulary & Conceptual Taxonomy

> **Course**: Analysis of Algorithms (AOA)  
> **Topic**: Route Planning & Shortest-Path Graph Search  
> **Student**: Parth  

This document lists and categorizes the specialized computer science, algorithm analysis, and spatial geometry terms incorporated into the RouteX **Word Art** and **Typographic Cloud** submission deliverables.

---

## 🧭 Tier 1: Primary Focal Terminology
- **RouteX**: The core academic project laboratory.
- **Dijkstra**: Dijkstra’s uniform-cost shortest-path algorithm ($f(n) = g(n)$).
- **A\* Search**: Heuristically guided optimal pathfinding ($f(n) = g(n) + h(n)$).
- **Breadth-First Search (BFS)**: Level-order blind search minimizing edge hops ($\mathcal{O}(V+E)$).
- **Depth-First Search (DFS)**: Deep branch-first blind traversal.
- **Greedy Best-First**: Pure heuristic goal-directed search ($f(n) = h(n)$).
- **Haversine**: Great-circle geodesic distance formulation for spherical Earth geometry.
- **Shortest Path**: Optimal minimum-cost route between source and target.

---

## 📐 Tier 2: Mathematical & Theoretical Foundations
- **Admissibility**: The condition $h(n) \le d^*(n)$ ensuring A* never overestimates cost.
- **Consistency (Monotonicity)**: The triangle inequality condition $h(u) \le c(u, v) + h(v)$.
- **Time Complexity**: Asymptotic runtime upper bounds ($\mathcal{O}(V + E)$, $\mathcal{O}((V + E) \log V)$).
- **Space Complexity**: Memory footprint requirements ($\mathcal{O}(V)$).
- **Big-O Notation**: Asymptotic notation characterizing algorithmic scalability.
- **Geodesic Distance**: The shortest path between two points on a curved surface.
- **Euclidean Metric**: Straight-line planar distance metric ($d = \sqrt{\Delta x^2 + \Delta y^2}$).
- **Manhattan Metric**: Taxicab / grid-aligned distance metric ($d = |\Delta x| + |\Delta y|$).
- **Relaxation**: The fundamental operation updating $d(v) = \min(d(v), d(u) + w(u, v))$.
- **Optimality**: Mathematical guarantee of discovering the global minimum cost.
- **Completeness**: Guarantee that an algorithm will find a solution if one exists.

---

## 🧱 Tier 3: Data Structures & Implementation Mechanics
- **Priority Queue**: Data structure maintaining elements ordered by key.
- **Binary Min-Heap**: Complete binary tree implementing priority queues in $\mathcal{O}(\log V)$ time.
- **FIFO Queue**: First-In-First-Out queue backing Breadth-First Search.
- **LIFO Stack**: Last-In-First-Out stack backing Depth-First Search.
- **Adjacency List**: Space-efficient graph representation ($\mathcal{O}(V + E)$).
- **Open List / Frontier**: The set of candidate nodes scheduled for expansion.
- **Closed Set / Explored**: The set of nodes whose shortest paths have been established.
- **Node Expansion**: The step of removing a node from the frontier and evaluating its neighbors.
- **Edge Weight**: The numerical physical cost assigned to a graph transition.
- **Branching Factor**: The average out-degree of vertices across the graph.

---

## 🏙️ Tier 4: Cartographic & Spatial Road Architecture
- **Metropolis Simulation**: 100+ node realistic procedural city road network.
- **Quadratic Bezier**: 3-point parametric curves modeling realistic curved road geometry.
- **River Bridge Corridors**: Spatial bottleneck structures testing heuristic divergence.
- **One-Way Corridors**: Directed edges modeling realistic traffic flow restrictions.
- **OpenStreetMap (OSM)**: Authentic urban road extract topologies (London, Manhattan, Mumbai).
- **Full-Screen SVG**: Responsive, hardware-accelerated vector mapping canvas.
- **Intersection Nodes**: Named physical vertices in the road network graph.
- **Dead-End Obstacles**: Spatial traps testing algorithm backtracking and recovery.

---

## 📊 Tier 5: Empirical Benchmarking & Analytics
- **Execution Time**: High-resolution latency measured in milliseconds.
- **Nodes Visited / Expanded**: Direct metric of computational search space efficiency.
- **Pruning Ratio**: Percentage reduction in node expansions achieved by A* over Dijkstra (40%–70%).
- **Hop Count**: Total number of edge segments traversed along the discovered route.
- **Heap Memory**: Peak RAM utilization during graph exploration.
- **CSV Export**: Standardized tabular data export for laboratory reports and statistical analysis.
