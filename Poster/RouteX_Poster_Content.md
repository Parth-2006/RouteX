# RouteX — Academic Research Poster Content

> **Project Title**: RouteX: Comparative Analysis & Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms  
> **Course**: Analysis of Algorithms (AOA)  
> **Author**: Parth  
> **Affiliation**: Department of Computer Science & Engineering  
> **Format Reference**: Academic Conference Poster (A1 / A2 / 16:9 Landscape & Portrait)  

---

## 1. Header Section
- **Title**: RouteX: Comparative Analysis & Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms
- **Subtitle**: Evaluating BFS, DFS, Dijkstra, A*, and Greedy Best-First Search on Procedural & Authentic Road Topologies
- **Student Name**: Parth
- **Academic Mentor / Subject**: Analysis of Algorithms Laboratory (AOA)
- **Repository**: [https://github.com/Parth-2006/RouteX](https://github.com/Parth-2006/RouteX)

---

## 2. Abstract & Problem Motivation
### Abstract
Modern intelligent transportation systems depend heavily on graph traversal and shortest-path algorithms. While theoretical asymptotic complexities ($\mathcal{O}(V+E)$ vs. $\mathcal{O}((V+E)\log V)$) are widely studied in textbooks, real-world algorithmic behavior is fundamentally shaped by spatial geometry, positive edge weights, and heuristic pruning. RouteX provides a 100% offline, deterministic experimental laboratory comparing BFS, DFS, Dijkstra, A*, and Greedy Best-First Search across both discrete 2D weighted grids and dense road networks ($100+$ intersections, $160+$ segments, and $9$ river bridge crossings).

### Problem Statement & Objectives
- **Objective 1**: Empirically evaluate execution latency, search space volume (node expansions), and solution distance on realistic road network topologies.
- **Objective 2**: Verify the mathematical admissibility and consistency of the great-circle Haversine heuristic in A* search.
- **Objective 3**: Analyze the engineering trade-off between hop-optimality (BFS) and physical distance-optimality (Dijkstra/A*).
- **Objective 4**: Demonstrate the vulnerability of pure greedy heuristics to local minima, dead-ends, and natural obstacles.

---

## 3. Algorithm Complexity & Theoretical Matrix

| Algorithm | Optimization Objective | Data Structure | Time Complexity | Space Complexity | Optimality Guarantee | Heuristic $h(n)$ |
|---|---|---|---|---|---|---|
| **Breadth-First Search (BFS)** | Fewest Edge Hops | FIFO Queue | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Hop-Optimal** (Unit cost edges) | Blind ($h(n) = 0$) |
| **Depth-First Search (DFS)** | Deepest Branch First | LIFO Stack | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Non-Optimal** (Arbitrary valid path) | Blind ($h(n) = 0$) |
| **Dijkstra’s Algorithm** | Minimal Physical Distance | Min-Heap Priority Queue | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V)$ | **Provably Optimal** ($w(e) \ge 0$) | Uniform ($f(n) = g(n)$) |
| **A\* Search (A-Star)** | Minimal Physical Distance | Min-Heap Priority Queue | $\mathcal{O}(E)$ best / $\mathcal{O}(V \log V)$ worst | $\mathcal{O}(V)$ | **Provably Optimal** ($h(n) \le d^*(n)$) | Haversine ($f = g + h$) |
| **Greedy Best-First Search** | Estimated Remaining Distance | Min-Heap Priority Queue | $\mathcal{O}(V \log V)$ worst | $\mathcal{O}(V)$ | **Non-Optimal** (Susceptible to traps) | Haversine ($f = h$) |

---

## 4. Methodology & Data Modeling
1. **Mathematical Graph Model**:
   - Directed weighted graph $G = (V, E)$ where vertices $V$ represent named intersections and directed edges $E$ represent road segments.
   - Spatial coordinates $(\text{lat}, \text{lng})$ projected to Euclidean canvas coordinates using dynamic bounding-box normalization.
2. **Geodesic Haversine Formulation**:
   - Exact physical edge weights in meters calculated via spherical trigonometry ($R = 6{,}371{,}000\text{ m}$):
     $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right), \quad d = 2R \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
3. **Admissibility Proof**:
   - Because straight-line distance is the geodesic minimum on a sphere, $h(n) \le d^*(n)$ holds unconditionally, guaranteeing that A* never overestimates cost and is provably optimal.
4. **Road Curvature via Quadratic Bezier Interpolation**:
   - Realistic road curves generated through 3-point Bezier interpolation rather than artificial line segments.

---

## 5. Experimental Results & Key Insights
1. **Dijkstra vs. A* Pruning Ratio**:
   - In cross-metropolis benchmarks (e.g., *Observatory Peak* to *Deepwater Port*), Dijkstra and A* produce the **exact same optimal path length** ($6{,}560\text{ m}$).
   - However, A* evaluates **58% fewer intersections** (14 vs. 33 nodes expanded), transforming the radial isotropic wavefront into a focused elliptical corridor directed toward the goal.
2. **Hop-Optimality vs. Metric-Optimality**:
   - BFS discovers a route with fewer road segments (4 hops), but its physical distance is $18.4\%$ longer than Dijkstra's path ($7{,}768\text{ m}$ vs. $6{,}560\text{ m}$).
   - This confirms that minimizing graph degree hops does not minimize physical spatial travel distance on weighted urban networks.
3. **Greedy Vulnerability to Obstacles**:
   - When routing across the river corridor, Greedy Best-First Search is trapped by dead-ends near river embankments, demonstrating that minimizing $h(n)$ alone without accumulated cost $g(n)$ fails in obstacle-laden environments.

---

## 6. Conclusions & Future Scope
- **Conclusions**: A* delivers the optimal balance of computational speed and solution quality for urban routing, outperforming Dijkstra in search space efficiency while matching its mathematical optimality.
- **Future Scope**: Integration of time-dependent dynamic edge costs (traffic congestion modeling), bidirectional A*, and Contraction Hierarchies (CH) for nationwide scale graphs.
