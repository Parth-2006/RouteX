# RouteX: Comparative Analysis & Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms on Realistic Road Topologies

> **Comprehensive Academic Project Report**  
> **Course**: Analysis of Algorithms (AOA) — Laboratory Coursework  
> **Student / Author**: Parth  
> **Academic Year**: 2025–2026  
> **Department**: Department of Computer Science & Engineering  
> **GitHub Repository**: [https://github.com/Parth-2006/RouteX](https://github.com/Parth-2006/RouteX)  

---

## Declaration & Certificate of Originality

This is to certify that the project entitled **"RouteX: Comparative Analysis & Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms on Realistic Road Topologies"** is a bona fide record of academic work carried out by **Parth** under the subject **Analysis of Algorithms (AOA)**. The empirical benchmarks, mathematical proofs, software architecture, and algorithmic implementations presented in this report represent original computational investigations.

---

## Executive Abstract

Shortest-path finding in spatial networks is among the most foundational problems in computer science, underpinning intelligent transportation systems (ITS), logistics dispatching, and robotic navigation. While textbook asymptotic bounds ($\mathcal{O}(V + E)$ vs. $\mathcal{O}((V + E) \log V)$) provide foundational theoretical classification, practical algorithmic behavior is profoundly governed by spatial geometry, positive physical edge costs, heuristic pruning efficiency, and network bottlenecks.

This project presents **RouteX**, an academic experimental laboratory designed to evaluate, benchmark, and visualize the five canonical graph traversal and shortest-path algorithms:
1. **Breadth-First Search (BFS)** — Blind Level-Order Exploration
2. **Depth-First Search (DFS)** — Blind Branch-Diving Traversal
3. **Dijkstra’s Algorithm** — Uniform-Cost Minimal Distance Search
4. **A\* Search (A-Star)** — Heuristically Guided Goal-Directed Search
5. **Greedy Best-First Search** — Pure Heuristic Aggressive Search

The system provides two distinct visualization and benchmarking environments:
1. **Realistic Offline City Road Network Visualizer (`/map`)**:
   - A high-density procedural road network comprising **100+ named intersections**, **160+ road segments**, and **9 river bridge crossings** across 11 metropolitan districts, accompanied by authentic real-world OpenStreetMap (OSM) extracts for **Central London**, **Manhattan**, and **South Mumbai**.
   - Quadratic Bezier road segment curvature and exact geodesic edge costs computed via the spherical Haversine metric.
   - 100% offline client-side execution with zero live API dependencies, zero tile server latency, and complete deterministic reproducibility.
2. **Interactive 2D Grid Visualizer (`/visualizer`)**:
   - Discrete 2D grid matrix with customizable terrain weights (swamps, mud, forests, water) and procedural maze generators.

Key theoretical and empirical findings demonstrated in this report include:
- **Mathematical Admissibility and Consistency Proofs**: Formally proving that the spherical great-circle Haversine metric satisfies $0 \le h(n) \le d^*(n)$ and the triangle inequality $h(u) \le c(u, v) + h(v)$, guaranteeing A* optimality without latitude distortion.
- **Search Space Pruning Efficiency**: A* expands **57.6% fewer intersections** than Dijkstra's algorithm while discovering the identical optimal path length ($6{,}560\text{ m}$).
- **Divergence of Hop-Optimality and Metric-Optimality**: BFS minimizes the number of intersection turns (4 hops vs. 6 hops for Dijkstra/A*), but produces a route that is **18.4% longer** in physical travel distance ($7{,}768\text{ m}$ vs. $6{,}560\text{ m}$).
- **Greedy Search Vulnerability**: Greedy Best-First Search commits aggressively to straight-line headings, causing severe entrapment near natural river barriers and dead-end alleys.

---

## Table of Contents
1. **Chapter 1: Introduction**
   - 1.1 Background & Context
   - 1.2 Problem Statement & Motivation
   - 1.3 Project Objectives
   - 1.4 Scope & Limitations
2. **Chapter 2: Literature Review & Algorithmic Foundations**
   - 2.1 Graph Theory Terminology
   - 2.2 Uninformed Search: BFS & DFS
   - 2.3 Informed Search: Dijkstra, A*, and Greedy
   - 2.4 Asymptotic Complexity Matrix
3. **Chapter 3: Mathematical Formulations & Proofs**
   - 3.1 Geodesic Haversine Formulation
   - 3.2 Formal Proof of A* Admissibility
   - 3.3 Formal Proof of A* Consistency (Monotonicity)
4. **Chapter 4: System Architecture & Cartographic Modeling**
   - 4.1 High-Level Architecture
   - 4.2 Procedural Metropolis Simulation (100+ Nodes)
   - 4.3 Quadratic Bezier Road Curvature
   - 4.4 Real-World OSM Extracts
5. **Chapter 5: Implementation Details**
   - 5.1 Binary Min-Heap Priority Queue
   - 5.2 Search Frame Tracer Engine
   - 5.3 Full-Screen SVG Visualizer Component
6. **Chapter 6: Empirical Results & Comparative Discussion**
   - 6.1 Experimental Setup & Test Scenarios
   - 6.2 Execution Latency Benchmarks
   - 6.3 Node Expansion & Pruning Ratio
   - 6.4 Hop-Optimality vs. Distance-Optimality
   - 6.5 Greedy Search Failure Analysis
7. **Chapter 7: Testing & Quality Assurance**
   - 7.1 Vitest Automated Test Suite (76 Tests)
   - 7.2 Linter & Typecheck Verification
   - 7.3 Production Build Validation
8. **Chapter 8: Conclusion & Future Scope**
   - 8.1 Summary of Contributions
   - 8.2 Future Research Directions
9. **References**
10. **Appendix: System User Guide**

---

## Chapter 1: Introduction

### 1.1 Background & Context
The problem of finding the shortest path between two points in a spatial network is a cornerstone of algorithm analysis and modern computational infrastructure. Navigation engines, autonomous vehicular fleets, and packet routing protocols all rely on efficient graph search algorithms.

### 1.2 Problem Statement & Motivation
In introductory computer science curricula, algorithm scalability is taught predominantly through Big-O asymptotic notation. However, asymptotic notation obscures critical spatial dynamics:
1. Dijkstra and A* both share an asymptotic upper bound of $\mathcal{O}((V + E) \log V)$ using binary min-heaps, yet in practice, A* executes significantly faster because an admissible heuristic restricts the search space to an elliptical cone rather than a radial circle.
2. BFS is often described as finding the "shortest path" in unweighted graphs, but in weighted spatial networks, it minimizes the number of intersection turns (hops), which can produce an arbitrarily long physical distance.
3. Existing educational tools often rely on external mapping APIs (e.g., Leaflet tile servers, Overpass API, Nominatim), which introduce network latency, tile loading failures, and rate limits that disrupt classroom instruction.

### 1.3 Project Objectives
- Build a **100% offline, deterministic experimental laboratory** in pure TypeScript and React.
- Implement and benchmark all 5 canonical algorithms on identical graph structures.
- Synthesize an expansive, realistic city road network ($100+$ intersections, $160+$ segments, $9$ bridges) with natural bottlenecks.
- Formally verify the admissibility and consistency of the Haversine metric.
- Provide interactive visual animations, metric bar charts, and CSV data export for academic research.

---

## Chapter 2: Literature Review & Algorithmic Foundations

### 2.1 Graph Theory Terminology
A spatial road network is modeled as a directed, weighted graph $G = (V, E, w)$:
- $V$: Set of vertices representing named intersections.
- $E \subseteq V \times V$: Set of directed edges representing road segments.
- $w: E \to \mathbb{R}^+$: Positive weight function representing physical road segment length in meters.

### 2.2 Uninformed Search: BFS & DFS
- **Breadth-First Search (BFS)**: Explores vertices in increasing order of edge hops from the source using a FIFO queue. Time complexity: $\mathcal{O}(V + E)$.
- **Depth-First Search (DFS)**: Recursively explores the deepest unvisited neighbor before backtracking using a LIFO stack. Non-optimal for path distance.

### 2.3 Informed Search: Dijkstra, A*, and Greedy
- **Dijkstra’s Algorithm**: Prioritizes vertices by exact accumulated distance $g(n)$ using a min-heap priority queue. Guarantees global distance optimality when all edge weights are non-negative ($w(e) \ge 0$).
- **A\* Search**: Combines accumulated distance $g(n)$ with estimated remaining distance $h(n)$ via the evaluation function $f(n) = g(n) + h(n)$.
- **Greedy Best-First Search**: Sets $f(n) = h(n)$, expanding solely based on proximity to the goal.

### 2.4 Asymptotic Complexity Matrix

| Algorithm | Data Structure | Time Complexity | Space Complexity | Optimality Guarantee | Heuristic Function $h(n)$ |
|---|---|---|---|---|---|
| **BFS** | FIFO Queue | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Hop-Optimal** (Unit cost) | None ($h(n) = 0$) |
| **DFS** | LIFO Stack | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Non-Optimal** | None ($h(n) = 0$) |
| **Dijkstra** | Min-Heap Priority Queue | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V)$ | **Distance-Optimal** ($w \ge 0$) | None ($f = g$) |
| **A\*** | Min-Heap Priority Queue | $\mathcal{O}(E) \dots \mathcal{O}(V \log V)$ | $\mathcal{O}(V)$ | **Distance-Optimal** | Haversine ($f = g + h$) |
| **Greedy BFS** | Min-Heap Priority Queue | $\mathcal{O}(V \log V)$ worst | $\mathcal{O}(V)$ | **Non-Optimal** | Haversine ($f = h$) |

---

## Chapter 3: Mathematical Formulations & Proofs

### 3.1 Geodesic Haversine Formulation
Because Earth is an oblate spheroid, planar Euclidean formulas ($\sqrt{\Delta x^2 + \Delta y^2}$) introduce severe spatial distortion across latitude degrees. RouteX computes physical edge distances and heuristic values using the great-circle Haversine formula ($R = 6{,}371{,}000\text{ m}$):

$$\Delta \phi = \phi_2 - \phi_1, \quad \Delta \lambda = \lambda_2 - \lambda_1$$
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right), \quad d = R \cdot c$$

### 3.2 Formal Proof of A* Admissibility
**Theorem**: The great-circle Haversine heuristic is admissible: $0 \le h(n) \le d^*(n, \text{dest}), \forall n \in V$.

**Proof**: By Riemannian geometry on a sphere, the geodesic arc represents the absolute minimum physical length connecting any two points on the surface. Because all physical roads are constrained to designated street paths on Earth's surface:
$$\text{Length}(\text{Any Road Path from } n \text{ to } \text{dest}) \ge d_{\text{Haversine}}(n, \text{dest})$$
Hence, the shortest road distance $d^*(n, \text{dest})$ satisfies:
$$d_{\text{Haversine}}(n, \text{dest}) \le d^*(n, \text{dest})$$
Therefore, $h(n)$ is admissible, guaranteeing that A* search will terminate with a globally optimal solution. $\blacksquare$

### 3.3 Formal Proof of A* Consistency (Monotonicity)
**Theorem**: The great-circle Haversine heuristic satisfies the consistency condition:
$$h(u) \le c(u, v) + h(v), \quad \forall (u, v) \in E$$

**Proof**: By the triangle inequality on geodesic metric spaces:
$$d_{\text{Haversine}}(u, \text{dest}) \le d_{\text{Haversine}}(u, v) + d_{\text{Haversine}}(v, \text{dest})$$
Because the actual road length $c(u, v)$ is greater than or equal to the straight-line geodesic distance $d_{\text{Haversine}}(u, v)$:
$$d_{\text{Haversine}}(u, \text{dest}) \le c(u, v) + d_{\text{Haversine}}(v, \text{dest})$$
$$h(u) \le c(u, v) + h(v)$$
Therefore, $h(n)$ is consistent (monotonic). This ensures that $f(n)$ is non-decreasing along any path and that nodes extracted from the priority queue are permanently closed without requiring re-expansion. $\blacksquare$

---

## Chapter 4: System Architecture & Cartographic Modeling

### 4.1 High-Level Architecture
RouteX is structured into four decoupled layers:
1. **Core Graph Engine (`src/algorithms/graph/`)**: Implements mathematical primitives, priority queues, and search algorithms.
2. **Procedural City Generator (`syntheticCityGenerator.ts`)**: Synthesizes 100+ node multi-district road networks with Bezier curvature.
3. **Search Tracer (`searchTracer.ts`)**: Records frame-by-frame traversal states.
4. **Presentation Layer (`CityMapVisualizer.tsx` & `MapDemo.tsx`)**: Hardware-accelerated SVG rendering, interactive endpoint picking, full-screen canvas, and Recharts analytics.

### 4.2 Procedural Metropolis Simulation (100+ Nodes)
The synthetic metropolis covers an area of $\sim 7.8\text{ km} \times 8.5\text{ km}$ across 11 districts:
- **North Highlands & Alpine Ridge**: Mountain passes and scenic overlooks (Observatory Peak).
- **Metropolis Financial Core**: Dense commercial grid and Tower Plaza.
- **Historic Old Town & Maritime Marina**: Irregular arterial waterfront blocks.
- **South Industrial Corridor**: Freight Rail Depot, Airport Terminal, and Deepwater Port.
- **Natural S-Curved River**: Bisects the city north-to-south, spanned by **9 distinct bridge corridors**.

### 4.3 Quadratic Bezier Road Curvature
Instead of artificial straight lines, road geometries are calculated using 3-point quadratic Bezier curves:
$$B(t) = (1-t)^2 P_1 + 2(1-t)t P_{\text{ctrl}} + t^2 P_2, \quad t \in [0, 1]$$
Physical road length is computed by integrating geodesic segments along the sampled curve.

### 4.4 Real-World OpenStreetMap Extracts
To validate findings against real-world topologies, RouteX incorporates pre-extracted sub-graphs:
- **Central London**: Historic non-grid street patterns (Hyde Park Corner to Bank).
- **Manhattan**: Grid avenues with diagonal Broadway and alternating one-way streets.
- **South Mumbai**: Marine Drive coastal promenade and commercial junctions.

---

## Chapter 5: Implementation Details

### 5.1 Binary Min-Heap Priority Queue
Implemented in `src/algorithms/graph/priorityQueue.ts`:
- Binary heap with 0-indexed array representation.
- Parent index: $\lfloor (i - 1)/2 \rfloor$; Left child: $2i + 1$; Right child: $2i + 2$.
- Push and extract-min operate in guaranteed $\mathcal{O}(\log V)$ time.

### 5.2 Search Frame Tracer
Implemented in `src/algorithms/graph/searchTracer.ts`:
- Captures snapshots at each expansion step: `currentNodeId`, `frontierNodeIds`, `discoveredNodeIds`, `expandedNodeIds`, `exploredEdgeKeys`, and `statusText`.
- Enables variable-speed playback (5ms to 150ms) and step-by-step frame examination.

### 5.3 Full-Screen SVG Visualizer
Implemented in `src/components/map/CityMapVisualizer.tsx`:
- SVG viewport mapping latitude/longitude coordinates to responsive screen space.
- Fullscreen mode toggle (`fixed inset-0 z-50 w-screen h-screen`) with `Escape` key handling.
- Integrated pan, zoom (0.5x to 5.0x), reset, and interactive node selection.

---

## Chapter 6: Empirical Results & Comparative Discussion

### 6.1 Experimental Setup
Benchmarks were executed on a standard personal computer running Vite 8 on Node.js v20. Performance was measured on the cross-city scenario (*Observatory Peak* to *Deepwater Port*) spanning $8.5\text{ km}$ across the metropolis.

### 6.2 Empirical Benchmark Summary Table

| Metric | A* Search | Dijkstra | BFS | Greedy BFS | DFS |
|---|---|---|---|---|---|
| **Execution Time (ms)** | **0.42** | 0.68 | 0.35 | 0.28 | 0.31 |
| **Nodes Expanded** | **14** | 33 | 29 | 19 | 45 |
| **Nodes Discovered** | 26 | 52 | 48 | 32 | 46 |
| **Path Distance (m)** | **6,560** | **6,560** | 7,768 | 8,240 | 11,920 |
| **Intersection Hops** | 6 | 6 | **4** | 8 | 14 |
| **Optimality Guarantee** | Provably Optimal | Provably Optimal | Hop-Optimal | Non-Optimal | Non-Optimal |

### 6.3 Key Analytical Discoveries
1. **Node Expansion Pruning (A* vs. Dijkstra)**:
   - Dijkstra expands 33 nodes in an isotropic circular wavefront.
   - A* expands only 14 nodes, pruning **57.6% of the search space**.
   - Both algorithms produce the exact same optimal distance ($6{,}560\text{ m}$).
2. **Hop-Optimality vs. Metric-Optimality**:
   - BFS discovers a path with only 4 intersection turns (hops).
   - However, its physical distance is $7{,}768\text{ m}$—**18.4% longer** than the optimal route.
   - This proves that hop-count minimization is fundamentally distinct from physical distance minimization in spatial networks.
3. **Greedy Vulnerability to Spatial Choke Points**:
   - Greedy Best-First Search rushes toward the destination coordinates.
   - Reaches the river embankment without an adjacent bridge crossing and becomes trapped in dead-end alleys, accumulating $8{,}240\text{ m}$ (+25.6% longer).

---

## Chapter 7: Testing & Quality Assurance

### 7.1 Automated Unit Test Suite (76 Tests)
RouteX includes 76 automated regression tests implemented using Vitest:
- `src/test/algorithms.test.ts` (35 tests): Tests 2D grid pathfinding, weighted terrains, obstacle blocking, and edge cases.
- `src/test/roadGraph.test.ts` (26 tests): Tests priority queue heap properties, Haversine accuracy, Dijkstra/A* optimality, and graph converters.
- `src/test/syntheticCityVisualizer.test.ts` (15 tests): Tests 100+ node city graph integrity, positive edge weights, search frame generation, and scenario continuity.

### 7.2 Linter & Typecheck Verification
- **TypeScript**: `tsc -b --noEmit` passes with **0 errors**.
- **Oxlint**: Passes with **0 errors and 0 warnings** across 37 files.
- **Production Build**: `vite build` builds an optimized, tree-shaken bundle in 2.22s.

---

## Chapter 8: Conclusion & Future Scope

### 8.1 Summary of Contributions
- Engineered a 100% offline, deterministic route planning algorithm experimental platform.
- Synthesized an expansive 100+ node metropolis with Bezier curved road geometries and 9 river bridge crossings.
- Mathematically proved the admissibility and consistency of the great-circle Haversine heuristic.
- Empirically demonstrated that A* achieves a 57.6% node reduction over Dijkstra with zero loss of optimality.
- Highlighted the critical distinction between BFS hop-optimality and metric spatial optimality.

### 8.2 Future Scope
- **Bidirectional A* Search**: Expanding simultaneous frontiers from both start and destination.
- **Contraction Hierarchies (CH)**: Implementing hierarchical node ordering and shortcut edges for nationwide networks.
- **Time-Dependent Dynamic Weights**: Incorporating real-time traffic congestion coefficients and turn delays.

---

## References
1. Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). A formal basis for the heuristic determination of minimum cost paths. *IEEE Transactions on Systems Science and Cybernetics*, 4(2), 100-107.
2. Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. *Numerische Mathematik*, 1(1), 269-271.
3. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson.
4. Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2022). *Introduction to Algorithms* (4th ed.). MIT Press.
5. Geisberger, R., Sanders, P., Schultes, D., & Delling, D. (2012). Contraction hierarchies: Faster and simpler hierarchical routing in road networks. *Experimental Algorithms*, 319-333.
6. Goldberg, A. V., & Harrelson, C. (2005). Computing the shortest path: A* search meets graph theory. *Proceedings of the 16th ACM-SIAM SODA*, 156-165.
7. OpenStreetMap Contributors. (2024). Planet dump [Data file from 2024]. https://planet.openstreetmap.org.

---

## Appendix: System User Guide

### Running RouteX Locally
```bash
git clone https://github.com/Parth-2006/RouteX.git
cd RouteX
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in any modern browser.

### Running Automated Test Suite
```bash
npm run test
```
All 76 tests will execute and report passing status.
