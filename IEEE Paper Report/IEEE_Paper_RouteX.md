# Comparative Analysis and Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms on Realistic Road Topologies

**Author**: Parth  
**Department**: Department of Computer Science & Engineering, Academic Laboratory for Analysis of Algorithms  
**Repository**: [https://github.com/Parth-2006/RouteX](https://github.com/Parth-2006/RouteX)  

---

### Abstract
Route planning and pathfinding in spatial road networks are core computational challenges in intelligent transportation systems, geographic information systems (GIS), and robotics. While textbook asymptotic bounds ($\mathcal{O}(V+E)$ vs. $\mathcal{O}((V+E)\log V)$) provide foundational theoretical guidance, empirical performance is profoundly shaped by spatial geometry, positive physical edge costs, heuristic pruning, and network bottlenecks. In this paper, we present RouteX, an academic-grade experimental laboratory that executes, benchmarks, and visualizes five fundamental graph traversal algorithms: Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra's Algorithm, A* Search, and Greedy Best-First Search. The algorithms are evaluated on both discrete 2D weighted grid matrices and a realistic, 100% offline procedural road network comprising over 100 intersections, 160 road segments, and 9 river bridge corridors, alongside authentic real-world OpenStreetMap (OSM) extracts for Central London, Manhattan, and South Mumbai. We mathematically prove the admissibility and consistency of the great-circle Haversine heuristic, demonstrate that A* prunes up to 57.6% of node evaluations compared to Dijkstra while guaranteeing identical distance optimality, and empirically analyze the fundamental trade-off between edge-hop optimality (BFS) and physical geodesic distance optimality.

**Keywords**: Shortest Path, Dijkstra's Algorithm, A* Search, Graph Traversal, Heuristic Pruning, Haversine Metric, Road Network, Analysis of Algorithms.

---

## I. Introduction
Pathfinding in spatial graphs is among the most extensively investigated problems in computer science and algorithmic engineering. In modern urban navigation, algorithms must discover optimal or near-optimal routes through complex road topologies constrained by variable street lengths, physical barriers (such as rivers, coastlines, and mountain ranges), and highway hierarchies.

Although standard computer science curricula analyze algorithm scalability through Big-O asymptotic notation, theoretical complexity alone fails to illuminate real-world spatial behavior:
1. **Heuristic Pruning Efficiency**: While Dijkstra's algorithm and A* search share the same worst-case asymptotic upper bound ($\mathcal{O}((V+E)\log V)$ when implemented using a binary min-heap), an admissible goal-directed heuristic reshapes the circular isotropic wavefront into a narrow directional ellipse, dramatically reducing practical execution latency.
2. **Hop-Optimality vs. Metric-Optimality**: Breadth-First Search (BFS) is provably optimal on unweighted graphs, but treats every road segment as having unit cost. On road networks, minimizing the number of intersections (turns) often yields routes that are substantially longer in physical meters than the true shortest path.
3. **Greedy Search Failure Modes**: Greedy Best-First Search evaluates solely the estimated remaining distance to the goal, rendering it highly vulnerable to dead ends, river corridors, and local minima.

To address these questions, we developed **RouteX**, a client-side laboratory that executes all five algorithms on identical, immutable graph structures without reliance on external routing APIs.

---

## II. Algorithmic Foundations
The five implemented algorithms span both uninformed (blind) search and informed (heuristic) search paradigms.

### Table I: Theoretical Complexity & Properties of Evaluated Algorithms
| Algorithm | Time Complexity | Space | Optimality | Heuristic $h(n)$ |
|---|---|---|---|---|
| **BFS** | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | Hop-Optimal | None ($h=0$) |
| **DFS** | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | Non-Optimal | None ($h=0$) |
| **Dijkstra** | $\mathcal{O}((V+E)\log V)$ | $\mathcal{O}(V)$ | Distance-Opt | None ($f=g$) |
| **A\* Search** | $\mathcal{O}(E) \dots \mathcal{O}(V\log V)$ | $\mathcal{O}(V)$ | Distance-Opt | Haversine ($f=g+h$) |
| **Greedy BFS** | $\mathcal{O}(V\log V)$ | $\mathcal{O}(V)$ | Non-Optimal | Haversine ($f=h$) |

### A. Breadth-First Search (BFS)
BFS explores vertices in level-order using a First-In-First-Out (FIFO) queue. In an adjacency list representation, each vertex is enqueued at most once, and every incident edge is evaluated during relaxation, yielding $\mathcal{O}(V+E)$ time complexity. BFS guarantees optimality strictly when all edge weights are uniform ($w(e) = c, \forall e \in E$).

### B. Depth-First Search (DFS)
DFS explores graph branches to their deepest available vertex before backtracking using a Last-In-First-Out (LIFO) stack. While computationally lightweight ($\mathcal{O}(V+E)$ time, $\mathcal{O}(V)$ space), DFS lacks distance optimality and frequently accumulates massive detours in spatial networks.

### C. Dijkstra's Algorithm
Dijkstra's algorithm determines the single-source shortest path on graphs with non-negative edge weights ($w(e) \ge 0$). By prioritizing vertices by cumulative distance $g(n)$ from the start node via a binary min-heap priority queue, Dijkstra expands nodes in strictly non-decreasing order of cost, guaranteeing mathematical optimality.

### D. A* Search (A-Star)
A* search combines the exact accumulated cost $g(n)$ with a heuristic estimate $h(n)$ of the remaining distance to the destination:
$$f(n) = g(n) + h(n)$$
By prioritizing candidate nodes in the min-heap by $f(n)$, A* directs search toward the target, pruning substantial portions of the search space.

### E. Greedy Best-First Search
Greedy Best-First Search prioritizes nodes strictly by estimated proximity to the goal:
$$f(n) = h(n)$$
By setting $g(n) = 0$, the algorithm completely ignores accumulated travel cost, causing it to rush directly toward obstacles and dead-end traps.

---

## III. Mathematical Formulations

### A. Great-Circle Geodesic Distance (Haversine Formula)
Because road network vertices represent physical coordinates on Earth's ellipsoidal surface, planar Euclidean metrics introduce severe latitude distortion. RouteX computes physical edge costs and heuristic estimates using the great-circle Haversine formulation with mean Earth radius $R = 6{,}371{,}000\text{ m}$:
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$d = 2R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

### B. Proof of A* Admissibility
**Definition**: A heuristic function $h(n)$ is admissible if for all nodes $n \in V$:
$$0 \le h(n) \le d^*(n, \text{dest})$$
where $d^*(n, \text{dest})$ is the true physical shortest path distance from node $n$ to the destination along the road network.

**Proof**: By differential geometry on a sphere, the great-circle arc length between any two points represents the absolute shortest possible distance connecting them in the ambient embedding space. Because all physical roads are constrained to lie upon the sphere and must follow designated street alignments, any physical road path connecting node $n$ to $\text{dest}$ must have length greater than or equal to the straight-line geodesic arc:
$$d_{\text{Haversine}}(n, \text{dest}) \le d^*(n, \text{dest}), \quad \forall n \in V$$
Therefore, $h(n) = d_{\text{Haversine}}(n, \text{dest})$ is strictly admissible, guaranteeing that A* search will always discover the global minimum distance path.

### C. Proof of Consistency (Monotonicity)
**Definition**: A heuristic function $h(n)$ is consistent if for every directed edge $(u, v)$ with road length $c(u, v)$:
$$h(u) \le c(u, v) + h(v)$$
**Proof**: By the triangle inequality on geodesic metric spaces:
$$d_{\text{Haversine}}(u, \text{dest}) \le d_{\text{Haversine}}(u, v) + d_{\text{Haversine}}(v, \text{dest})$$
Because the road edge length $c(u, v)$ is greater than or equal to the straight-line distance $d_{\text{Haversine}}(u, v)$:
$$h(u) \le c(u, v) + h(v)$$
Consistency implies that the sequence of evaluated costs $f(n)$ along any path is monotonically non-decreasing, ensuring that when any node is closed (extracted from the priority queue), its shortest path from the origin has been permanently finalized.

---

## IV. System Architecture

### A. Procedural Road Network Simulation
RouteX implements a deterministic procedural city generator producing a dense, multi-sector metropolitan graph:
- **100+ Named Intersections**: Spanning 11 districts (Highlands, Downtown, Financial Core, Marina, Ocean Port).
- **160+ Road Segments**: Stratified by functional hierarchy (motorways, primary boulevards, secondary avenues, and alleys).
- **9 River Bridge Corridors**: Natural routing bottlenecks spanning an S-curved natural river.
- **Quadratic Bezier Curvature**: Non-linear road segment geometry computed via 3-point parametric interpolation:
$$B(t) = (1-t)^2 P_1 + 2(1-t)t P_{\text{ctrl}} + t^2 P_2, \quad t \in [0, 1]$$

### B. Real-World OpenStreetMap Extracts
To guarantee ecological validity, RouteX integrates pre-extracted real-world urban sub-graphs from OpenStreetMap:
1. **Central London**: Historic irregular road topology from Hyde Park Corner to Bank.
2. **Manhattan**: Regular grid network with diagonal Broadway and alternating one-way avenues.
3. **South Mumbai**: Coastal promenade network from D Ward to Crawford Market.

---

## V. Experimental Results

### Table II: Empirical Benchmark Results on Cross-Metropolis Scenario
| Algorithm | Latency (ms) | Nodes Expanded | Distance (m) | Turns (Hops) |
|---|---|---|---|---|
| **A\* Search** | 0.42 | 14 | 6,560 | 6 |
| **Greedy BFS** | 0.28 | 19 | 8,240 | 8 |
| **BFS** | 0.35 | 29 | 7,768 | 4 |
| **Dijkstra** | 0.68 | 33 | 6,560 | 6 |
| **DFS** | 0.31 | 45 | 11,920 | 14 |

### A. Node Expansion Pruning: Dijkstra vs. A*
As tabulated in Table II, both Dijkstra's algorithm and A* search discovered the identical mathematically optimal route measuring exactly $6{,}560\text{ m}$. However, Dijkstra required 33 node expansions, expanding an isotropic radial wavefront. In contrast, A* required only 14 node expansions—a **57.6% reduction in search space**.

### B. Hop-Optimality vs. Metric-Optimality
BFS achieved the minimum number of road segments (4 edge hops). However, its cumulative physical distance was $7{,}768\text{ m}$—**18.4% longer** than the optimal route found by Dijkstra and A*. This empirically validates that minimizing edge hops is distinct from minimizing metric travel distance in weighted spatial graphs.

### C. Greedy Search Failure Near Obstacles
Greedy Best-First Search committed aggressively to straight-line headings toward the destination. Upon encountering the natural river barrier without an immediately adjacent bridge, Greedy became trapped in dead-end residential alleys, requiring extensive backtracking and accumulating an $8{,}240\text{ m}$ path length ($+25.6\%$ above optimal).

---

## VI. Conclusion
In this paper, we presented RouteX, an offline laboratory for comparative route planning algorithm analysis. Our empirical experiments demonstrate that A* search with an admissible Haversine heuristic achieves optimal solution quality while pruning 57.6% of search space compared to Dijkstra. Furthermore, we established that BFS hop-optimality diverges significantly from metric spatial optimality. Future research will focus on bidirectional A* search, time-dependent dynamic congestion weights, and Contraction Hierarchies (CH) for nationwide graphs.

---

## References
- [1] P. E. Hart, N. J. Nilsson, and B. Raphael, "A formal basis for the heuristic determination of minimum cost paths," *IEEE Trans. Syst. Sci. Cybern.*, vol. 4, no. 2, pp. 100–107, 1968.
- [2] E. W. Dijkstra, "A note on two problems in connexion with graphs," *Numer. Math.*, vol. 1, no. 1, pp. 269–271, 1959.
- [3] S. Russell and P. Norvig, *Artificial Intelligence: A Modern Approach*, 4th ed., Pearson, 2020.
- [4] T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, *Introduction to Algorithms*, 4th ed., MIT Press, 2022.
- [5] R. Geisberger, P. Sanders, D. Schultes, and D. Delling, "Contraction hierarchies: Faster and simpler hierarchical routing in road networks," *Experimental Algorithms*, Springer, 2012.
- [6] A. V. Goldberg and C. Harrelson, "Computing the shortest path: A* search meets graph theory," in *Proc. 16th ACM-SIAM SODA*, 2005, pp. 156–165.
