# RouteX — Comprehensive Project Mind Map

> **Analysis of Algorithms (AOA) Academic Project**  
> **Topic:** Analysis & Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms  
> **Student / Author:** Parth  

---

## 🗺️ Mermaid.js Diagram Representation

```mermaid
mindmap
  root((RouteX Algorithm Lab))
    Uninformed Search
      Breadth-First Search (BFS)
        FIFO Queue
        O(V + E) Time
        O(V) Space
        Hop-Optimal (Unit Cost)
      Depth-First Search (DFS)
        LIFO Stack / Recursion
        O(V + E) Time
        O(V) Space
        Non-Optimal (Deep Traversal)
    Heuristic & Informed Search
      Dijkstra's Algorithm
        Min-Heap Priority Queue
        O((V+E) log V) Time
        Metric Optimal (w >= 0)
        Uniform Wavefront Expansion
      A* Search
        f(n) = g(n) + h(n)
        Admissible Haversine Heuristic
        40% - 70% Node Pruning
        Provably Optimal
      Greedy Best-First Search
        f(n) = h(n)
        Aggressive Target Heading
        Non-Optimal
        Prone to Obstacles
    Mathematical Foundations
      Haversine Great-Circle Metric
        Earth Radius R = 6,371,000m
        Spherical Trigonometry
      Admissibility & Consistency
        h(n) <= d*(n)
        Triangle Inequality
        Monotonic f(n)
      Complexity Theory
        Adjacency List vs Matrix
        Big-O Bounds
    Road Network Architecture
      Metropolis Simulation
        100+ Intersections
        160+ Road Segments
        9 River Bridges
        S-Curved River Corridor
      Bezier Road Curvature
        Quadratic Bezier Interpolation
        Physical Road Lengths
      Real-World OSM Extracts
        Central London
        Manhattan Grid
        South Mumbai
    Empirical Benchmarks
      Evaluation Metrics
        Execution Time (ms)
        Node Expansions
        Cumulative Distance (m)
        Peak Heap Memory
      Interactive Lab
        Full-Screen Map Visualizer
        2D Weighted Grid
        Recharts Visual Analytics
        CSV Metric Export
```

---

## 🌳 Detailed Structural Mind Map Breakdown

### 1. Core Hub: RouteX Algorithm Lab
- **Domain**: Graph Theory & Analysis of Algorithms (AOA)
- **Objective**: Rigorous empirical and theoretical comparison of shortest path algorithms across synthetic and authentic road networks.

---

### 2. Branch 1: Uninformed (Blind) Search Algorithms
1. **Breadth-First Search (BFS)**:
   - **Data Structure**: First-In-First-Out (FIFO) Queue.
   - **Time Complexity**: $\mathcal{O}(V + E)$ using adjacency list representation.
   - **Space Complexity**: $\mathcal{O}(V)$ for visited set and queue frontier.
   - **Optimality**: Provably optimal **only** for unweighted graphs or graphs with uniform edge weights. On road networks, it minimizes intersection hops (turns) rather than physical meters.
   - **Completeness**: Complete on finite branching graphs.
2. **Depth-First Search (DFS)**:
   - **Data Structure**: Last-In-First-Out (LIFO) Stack or call-stack recursion.
   - **Time Complexity**: $\mathcal{O}(V + E)$.
   - **Space Complexity**: $\mathcal{O}(V)$ in worst case (linear chain).
   - **Optimality**: Non-optimal. Tends to explore extreme branch depths, accumulating excessive distance.
   - **Completeness**: Complete on finite acyclic graphs; requires cycle detection for general graphs.

---

### 3. Branch 2: Heuristic & Informed Shortest Path Algorithms
1. **Dijkstra’s Algorithm**:
   - **Data Structure**: Binary Min-Heap Priority Queue.
   - **Evaluation Metric**: $f(n) = g(n)$ (cumulative distance from start).
   - **Time Complexity**: $\mathcal{O}((V + E) \log V)$ with binary heap; $\mathcal{O}(E + V \log V)$ with Fibonacci heap.
   - **Space Complexity**: $\mathcal{O}(V)$.
   - **Optimality**: Mathematically provably optimal for all non-negative edge costs ($w(e) \ge 0$).
   - **Frontier Pattern**: Circular isotropic wavefront expanding uniformly in all directions.
2. **A\* Search (A-Star)**:
   - **Data Structure**: Binary Min-Heap Priority Queue indexed on $f(n)$.
   - **Evaluation Metric**: $f(n) = g(n) + h(n)$, combining actual cost $g(n)$ and estimated remaining cost $h(n)$.
   - **Heuristic**: Straight-line great-circle Haversine distance to destination.
   - **Optimality**: Provably optimal under admissible heuristics ($h(n) \le d^*(n)$).
   - **Pruning Efficiency**: Shapes the search wavefront into an oriented ellipse, pruning **40% to 70% of node expansions** compared to Dijkstra.
3. **Greedy Best-First Search**:
   - **Data Structure**: Binary Min-Heap Priority Queue indexed on $h(n)$.
   - **Evaluation Metric**: $f(n) = h(n)$, completely ignoring accumulated cost $g(n)$.
   - **Optimality**: Non-optimal. Aggressive progress toward the target leads to severe dead-end traps and wide river/obstacle detours.

---

### 4. Branch 3: Mathematical & Theoretical Foundations
1. **Great-Circle Haversine Formulation**:
   - Accurate geodesic distance computation accounting for Earth's curvature ($R = 6{,}371{,}000\text{ m}$).
2. **Admissibility Proof**:
   - Because the shortest path between any two points in spherical geometry is the great-circle arc, straight-line distance never exceeds physical road distance ($0 \le h(n) \le d^*(n)$).
3. **Consistency (Monotonicity)**:
   - Satisfies the triangle inequality $h(u) \le c(u, v) + h(v)$, ensuring closed nodes are never reopened.
4. **Graph Representation**:
   - Directed Adjacency List ($G = (V, E)$), enabling $\mathcal{O}(\text{deg}(u))$ neighbor lookups.

---

### 5. Branch 4: Cartographic & Road Network Architecture
1. **Metropolis Road Network Simulation**:
   - 100+ named intersections across 11 metropolitan districts.
   - 160+ road segments with road hierarchies: motorways, primary boulevards, secondary streets, and residential alleys.
   - S-curved river channel crossed by 9 distinct bridge corridors.
2. **Realistic Quadratic Bezier Road Curvature**:
   - Non-linear road geometry computed via quadratic Bezier interpolation, avoiding artificial straight lines.
3. **Real-World OSM Extracts**:
   - Pre-extracted, verified road graphs for Central London, Manhattan, and South Mumbai.
4. **Full-Screen SVG Visualizer**:
   - High-performance, hardware-accelerated SVG canvas with interactive pan, zoom (50%–500%), and full-screen mode.

---

### 6. Branch 5: Empirical Benchmarking & Experimental Results
1. **Evaluation Metrics**:
   - Execution latency in milliseconds (sub-millisecond high-resolution timers).
   - Node expansion count (search space volume).
   - Cumulative path distance in meters (solution quality).
   - Peak heap memory consumption.
2. **Interactive Tools**:
   - Step-by-step frame tracer with adjustable playback speeds (5ms–150ms).
   - Recharts comparative bar charts.
   - Single-click CSV metric exporter.
