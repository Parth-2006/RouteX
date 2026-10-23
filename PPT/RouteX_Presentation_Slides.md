# RouteX — Academic Presentation Slide Deck & Speaker Notes

> **Course**: Analysis of Algorithms (AOA)  
> **Topic**: Empirical Benchmarking & Comparative Analysis of Shortest Path Algorithms  
> **Presenter / Author**: Parth  
> **Deck Length**: 20 Slides  

---

## Slide 1: Title Slide
- **Title**: RouteX: Analysis of Route Planning Algorithms
- **Subtitle**: Comparative Benchmarking of BFS, DFS, Dijkstra, A*, and Greedy Best-First Search on Realistic Road Topologies
- **Student Name**: Parth
- **Department**: Department of Computer Science & Engineering
- **Course**: Analysis of Algorithms (AOA) Laboratory
- **GitHub Repository**: [https://github.com/Parth-2006/RouteX](https://github.com/Parth-2006/RouteX)

> **Speaker Notes**:  
> Good morning respected professors and evaluators. Today I am presenting RouteX, an academic-grade experimental laboratory designed to evaluate, visualize, and benchmark the five fundamental graph traversal and shortest path algorithms on both discrete grids and realistic road networks.

---

## Slide 2: Executive Summary & Project Abstract
- **Core Problem**: Evaluating how spatial network topology, positive physical edge costs, and heuristic pruning affect real-world shortest path performance.
- **Algorithms Evaluated**:
  - Uninformed: Breadth-First Search (BFS), Depth-First Search (DFS)
  - Informed: Dijkstra's Algorithm, A* Search, Greedy Best-First Search
- **Key Environments**:
  - 100% Offline Procedural City Road Network (100+ intersections, 160+ segments, 9 river bridges).
  - Authentic OpenStreetMap Extracts (Central London, Manhattan, South Mumbai).
  - Discrete 2D Weighted Grid Matrix with terrain obstacles.
- **Execution Model**: Pure client-side in-browser execution with zero paid APIs, zero tile server latency, and 100% deterministic reproducibility.

> **Speaker Notes**:  
> RouteX eliminates external API dependencies to provide an unbiased, mathematically pure experimental environment where all algorithms run on identical immutable graph snapshots.

---

## Slide 3: Motivation & Research Questions
- **Why Study Road Networks Beyond Textbooks?**
  1. *Heuristic Pruning*: How much search space does an admissible heuristic actually save compared to Dijkstra's uniform expansion?
  2. *Hop vs. Metric Optimality*: Does the route with the fewest turns (BFS) minimize physical distance?
  3. *Obstacle Vulnerability*: How severely does Greedy Best-First Search degrade when natural obstacles (rivers, dead-ends) block the straight line?
- **Research Goal**: Bridge the gap between theoretical Big-O notation and practical spatial graph routing.

---

## Slide 4: Algorithmic Foundations: Uninformed vs. Informed Search
- **Uninformed (Blind) Search**:
  - Explores graph structure without any estimation of distance to the destination.
  - **BFS**: Explores level-by-level using a FIFO queue. Optimal only for unweighted or unit-cost edges.
  - **DFS**: Dives deeply along branches using a LIFO stack. Non-optimal; prone to severe detours.
- **Informed (Heuristic) Search**:
  - Employs domain knowledge to estimate remaining cost to the goal.
  - **Dijkstra**: Evaluates known cost $g(n)$. Optimal for non-negative edge costs ($w \ge 0$).
  - **A\* Search**: Evaluates $f(n) = g(n) + h(n)$. Combines actual distance with admissible remaining estimate.
  - **Greedy Best-First**: Evaluates $f(n) = h(n)$. Aggressive target pursuit; non-optimal.

---

## Slide 5: Theoretical Complexity Matrix

| Algorithm | Data Structure | Time Complexity | Space Complexity | Optimality Guarantee | Heuristic $h(n)$ |
|---|---|---|---|---|---|
| **BFS** | FIFO Queue | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Hop-Optimal** (Unit cost) | None ($h=0$) |
| **DFS** | LIFO Stack | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Non-Optimal** | None ($h=0$) |
| **Dijkstra** | Min-Heap Priority Queue | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V)$ | **Distance-Optimal** ($w \ge 0$) | None ($f=g$) |
| **A\*** | Min-Heap Priority Queue | $\mathcal{O}(E) \dots \mathcal{O}(V \log V)$ | $\mathcal{O}(V)$ | **Distance-Optimal** | Haversine ($f=g+h$) |
| **Greedy BFS** | Min-Heap Priority Queue | $\mathcal{O}(V \log V)$ | $\mathcal{O}(V)$ | **Non-Optimal** | Haversine ($f=h$) |

> **Speaker Notes**:  
> Notice that while Dijkstra and A* share the same theoretical worst-case bound, A* consistently achieves near-linear $\mathcal{O}(E)$ runtime in practice when guided by a strong admissible heuristic.

---

## Slide 6: Mathematical Formulations: Haversine Geodesic Metric
- **The Problem with Euclidean Distance on Lat/Lng**:
  - Degrees of latitude and longitude are not square; planar formulas introduce severe spatial distortion.
- **The Spherical Great-Circle Solution**:
  - Mean Earth radius $R = 6{,}371{,}000\text{ meters}$.
  $$\Delta \phi = \phi_2 - \phi_1, \quad \Delta \lambda = \lambda_2 - \lambda_1$$
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right), \quad d = R \cdot c$$
- **Application**: Used to calculate physical road segment edge weights and straight-line heuristic distances.

---

## Slide 7: Mathematical Proof of A* Admissibility & Consistency
- **Admissibility Condition**: $0 \le h(n) \le d^*(n, \text{dest})$
  - *Proof*: By spherical differential geometry, the great-circle arc is the shortest possible path between two coordinates. Because physical roads lie on Earth's surface, any road path must be $\ge$ the great-circle distance. Hence $h(n)$ never overestimates cost.
- **Consistency (Monotonicity) Condition**: $h(u) \le c(u, v) + h(v)$
  - *Proof*: Follows directly from the triangle inequality on geodesic metric spaces.
  - *Result*: Guarantees that $f(n)$ is monotonically non-decreasing and closed nodes are never reopened.

---

## Slide 8: System Architecture & Data Modeling
- **Graph Representation**:
  - Directed Adjacency List ($G = (V, E)$).
  - Vertices ($V$): Named intersections with latitude/longitude coordinates and district tags.
  - Edges ($E$): Directed road segments with distance in meters, road type, and Bezier geometry points.
- **Binary Min-Heap Priority Queue**:
  - $\mathcal{O}(\log V)$ insertion and extract-min operations.
  - Tracks node coordinates, current costs, and parent pointers for path reconstruction.
- **Search Tracer Engine**:
  - Captures frame-by-frame state (active node, frontier queue, discovered set, expanded set) for fluid step-by-step playback.

---

## Slide 9: Procedural Metropolis Road Network Simulation
- **Scale**: 100+ named intersections across 11 distinct metropolitan districts.
- **Districts Modeled**:
  - North Highlands & Alpine Ridge (Mountain passes, Observatory Peak).
  - Silicon Tech Corridor & Metropolis Tower Plaza.
  - Arts District, Historic Old Town, and Maritime Marina.
  - South Freight Rail Depot, Airport Terminal, and Deepwater Port.
- **Road Hierarchies**:
  - Motorways (high-speed orbital corridors).
  - Primary boulevards (broad commercial transit lines).
  - Secondary avenues and residential streets.
  - Dead-ends and alleys (obstacle traps).

---

## Slide 10: River Corridor Bottlenecks & Bezier Road Curvature
- **S-Curved River Corridor**:
  - Bisects the metropolis from north to south.
  - Natural spatial bottleneck crossed by **9 distinct bridge corridors** (suspension bridges, viaducts, transit spans).
  - Forces algorithms to make strategic heuristic decisions on where to cross.
- **Realistic Road Curvature**:
  - Generated using 3-point quadratic Bezier curves:
  $$B(t) = (1-t)^2 P_1 + 2(1-t)t P_{\text{ctrl}} + t^2 P_2$$
  - Eliminates artificial straight lines, yielding authentic organic street layouts.

---

## Slide 11: Real-World OpenStreetMap (OSM) Extracts
- **Central London Network**:
  - Irregular historical road topology.
  - Features Hyde Park Corner, Piccadilly, Westminster, and Bank junctions.
- **Manhattan Grid**:
  - Classic grid system with diagonal Broadway cutting across avenues.
  - Includes alternating one-way traffic restrictions.
- **South Mumbai Coastal Network**:
  - Marine Drive promenade, Crawford Market, and Kalbadevi commercial corridors.
- **Academic Value**: Confirms that algorithm behaviors observed on procedural networks replicate identically on real-world urban maps.

---

## Slide 12: Interactive Lab & Full-Screen Canvas
- **Hardware-Accelerated SVG Rendering**:
  - Smooth pan and pinch/scroll-wheel zoom (0.5x to 5.0x magnification).
  - One-click "Fit Network to View" button.
- **Full-Screen Coverage**:
  - Dedicated fullscreen toggle (`fixed inset-0 z-50 w-screen h-screen`).
  - Press `Escape` or click the exit pill to return to standard layout.
- **Dual Endpoint Selection**:
  - Click any intersection node directly on the SVG map to set Start/Destination.
  - Searchable dropdown selectors with instant endpoint swapping.
- **Multi-Route Visual Comparison**:
  - Distinct glowing path colors for each algorithm (Dijkstra: Cyan, A*: Emerald, BFS: Blue, Greedy: Amber, DFS: Pink).

---

## Slide 13: Empirical Evaluation: Execution Latency (ms)
- **Benchmark Scenario**: Cross-Metropolis Route (*Observatory Peak* to *Deepwater Port*).
- **Results**:
  - Greedy Best-First: $0.28\text{ ms}$ (Fastest, but non-optimal).
  - DFS: $0.31\text{ ms}$ (Fast, but winding path).
  - BFS: $0.35\text{ ms}$.
  - A* Search: $0.42\text{ ms}$ (Optimal distance with low latency).
  - Dijkstra: $0.68\text{ ms}$ (Slower due to isotropic radial expansion).
- **Finding**: A* executes **38.2% faster than Dijkstra** on weighted road networks.

---

## Slide 14: Empirical Evaluation: Search Space & Node Pruning
- **Node Expansions (Search Volume)**:
  - A* Search: **14 nodes expanded**.
  - Greedy Best-First: 19 nodes expanded.
  - BFS: 29 nodes expanded.
  - Dijkstra: **33 nodes expanded**.
  - DFS: 45 nodes expanded.
- **Key Insight**:
  - A* achieves a **57.6% node pruning ratio** compared to Dijkstra.
  - The admissible Haversine heuristic focuses the search into a directed elliptical corridor, pruning more than half of the search space.

---

## Slide 15: Empirical Evaluation: Solution Distance & Optimality
- **Path Length Discovered**:
  - Dijkstra: **$6{,}560\text{ meters}$** (Provably Optimal).
  - A* Search: **$6{,}560\text{ meters}$** (Provably Optimal).
  - BFS: $7{,}768\text{ meters}$ (+18.4% longer).
  - Greedy Best-First: $8{,}240\text{ meters}$ (+25.6% longer).
  - DFS: $11{,}920\text{ meters}$ (+81.7% longer).
- **Key Insight**:
  - BFS minimizes intersection turns (4 hops vs. 6 hops for Dijkstra/A*), but its physical road distance is $18.4\%$ longer.
  - **Conclusion**: Hop-optimality does not equal distance-optimality in spatial networks.

---

## Slide 16: Greedy Best-First Search Failure Modes
- **The Flaw of $f(n) = h(n)$**:
  - Ignores accumulated distance $g(n)$, assuming straight-line heading is always viable.
- **Observation near River Corridor**:
  - Greedy charges directly toward the destination coordinates.
  - Reaches the river embankment without an adjacent bridge crossing.
  - Trapped in local minima / dead-end alleys; forced to backtrack extensively.
- **Lesson**: Greedy search is hazardous in obstacle-dense environments.

---

## Slide 17: Discrete 2D Grid Visualizer & Weighted Terrains
- **Grid Environment (`/visualizer`)**:
  - Matrix grid with customizable start and target nodes.
  - Terrain weights: Mud ($3\times$), Forest ($5\times$), Swamp ($10\times$), Water ($\infty$ obstacle).
  - Procedural maze generators: Recursive Division and Random Density Obstacles.
- **Heuristic Comparison**:
  - Manhattan Metric ($d = |\Delta x| + |\Delta y|$) vs. Euclidean Metric ($d = \sqrt{\Delta x^2 + \Delta y^2}$).
  - Shows isotropic circle (Dijkstra) vs. goal-directed cone (A*).

---

## Slide 18: System Limitations & Engineering Trade-Offs
1. **Client-Side Browser Execution vs. Continental Graphs**:
   - Planetary OpenStreetMap networks require gigabytes of RAM and precomputed indexes.
   - RouteX operates on bounded metropolitan graphs ($30$ to $1{,}000$ nodes) to prevent browser heap exhaustion and maintain transparent single-threaded inspection.
2. **Deterministic Offline Architecture vs. Public API Limits**:
   - Public Overpass mirrors enforce strict rate limits (`HTTP 429`) and timeouts.
   - Built-in procedural and extracted networks guarantee 100% offline reliability for academic evaluations.
3. **Pure Physical Geodesics vs. Traffic Heuristics**:
   - Edge costs are defined strictly as geodesic road lengths in meters to maintain unbiased mathematical verification aligned with college curricula.

---

## Slide 19: Conclusions & Key Learnings
1. **A* Search is the Superior General-Purpose Algorithm**:
   - Matches Dijkstra's exact mathematical optimality while reducing node expansions by $57.6\%$.
2. **BFS Hop-Optimality Differs from Spatial Optimality**:
   - Minimizing turns does not minimize travel distance on weighted networks.
3. **Admissible Heuristics are Vital**:
   - Great-circle Haversine provides provable admissibility ($h(n) \le d^*(n)$) without planar distortion.
4. **Interactive Visualization Enhances Comprehension**:
   - Frame-by-frame tracing makes abstract search state transitions immediately transparent.

---

## Slide 20: Future Scope & Q&A
- **Future Enhancements**:
  - Bidirectional A* Search (meeting in the middle from start and target).
  - Time-dependent dynamic edge costs (traffic congestion simulation).
  - Contraction Hierarchies (CH) for sub-millisecond nationwide routing queries.
- **Project Verification**:
  - 76 Passing Unit Tests in Vitest.
  - Zero linter warnings (`oxlint`), zero TypeScript errors (`tsc -b`).
- **Open for Questions**:
  - Thank you! Let's begin the Q&A / Demonstration.
