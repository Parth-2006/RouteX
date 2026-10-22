import { AlgorithmInfo } from '../algorithms/types';

export const ALGORITHM_INFO: AlgorithmInfo[] = [
  {
    name: 'BFS',
    fullName: 'Breadth-First Search',
    description:
      'BFS explores all nodes at the current depth level before moving to the next depth level. It uses a FIFO queue and guarantees the shortest path in unweighted graphs (fewest edges). It does not consider edge weights — every move has equal cost.',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    optimal: 'Yes (unweighted graphs only)',
    complete: 'Yes (finite graphs)',
    usesWeights: false,
    usesHeuristic: false,
    dataStructure: 'FIFO Queue',
    pseudocode: `function BFS(graph, start, goal):
    queue ← [start]
    visited ← {start}
    parent ← {start: null}

    while queue is not empty:
        current ← queue.dequeue()
        if current == goal:
            return reconstructPath(parent, goal)

        for each neighbor of current:
            if neighbor not in visited:
                visited.add(neighbor)
                parent[neighbor] ← current
                queue.enqueue(neighbor)

    return "no path found"`,
    useCases: [
      'Finding shortest path in unweighted graphs',
      'Level-order traversal of trees',
      'Finding connected components',
      'Social network analysis (degrees of separation)',
    ],
    limitations: [
      'Does not consider edge weights',
      'High memory usage for wide graphs',
      'Not suitable for weighted shortest path problems',
    ],
  },
  {
    name: 'DFS',
    fullName: 'Depth-First Search',
    description:
      'DFS explores as far as possible along each branch before backtracking. It uses a LIFO stack (or recursion). DFS finds a valid path but does NOT guarantee the shortest or lowest-cost path. It is memory-efficient for deep graphs.',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V) — proportional to max depth',
    optimal: 'No',
    complete: 'Yes (finite graphs with cycle detection)',
    usesWeights: false,
    usesHeuristic: false,
    dataStructure: 'LIFO Stack',
    pseudocode: `function DFS(graph, start, goal):
    stack ← [start]
    visited ← {}
    parent ← {start: null}

    while stack is not empty:
        current ← stack.pop()
        if current in visited: continue
        visited.add(current)

        if current == goal:
            return reconstructPath(parent, goal)

        for each neighbor of current:
            if neighbor not in visited:
                parent[neighbor] ← current
                stack.push(neighbor)

    return "no path found"`,
    useCases: [
      'Topological sorting',
      'Detecting cycles in graphs',
      'Maze generation',
      'Finding any valid path (not necessarily shortest)',
    ],
    limitations: [
      'Does not guarantee shortest path',
      'Does not consider edge weights',
      'Can get stuck in deep branches',
      'Path found depends on neighbor ordering',
    ],
  },
  {
    name: 'Dijkstra',
    fullName: "Dijkstra's Algorithm",
    description:
      "Dijkstra's algorithm finds the minimum-cost path from the source to all reachable nodes. It uses a priority queue ordered by cumulative cost (g-score). It requires non-negative edge weights and guarantees optimality.",
    timeComplexity: 'O((V + E) log V) with binary heap',
    spaceComplexity: 'O(V)',
    optimal: 'Yes (non-negative weights)',
    complete: 'Yes (finite graphs with non-negative weights)',
    usesWeights: true,
    usesHeuristic: false,
    dataStructure: 'Min-Heap Priority Queue',
    pseudocode: `function Dijkstra(graph, start, goal):
    pq ← MinHeap()
    pq.insert(start, 0)
    dist ← {start: 0}
    parent ← {start: null}
    visited ← {}

    while pq is not empty:
        current ← pq.extractMin()
        if current in visited: continue
        visited.add(current)

        if current == goal:
            return reconstructPath(parent, goal)

        for each neighbor of current:
            cost ← dist[current] + weight(current, neighbor)
            if cost < dist.get(neighbor, ∞):
                dist[neighbor] ← cost
                parent[neighbor] ← current
                pq.insert(neighbor, cost)

    return "no path found"`,
    useCases: [
      'GPS navigation systems',
      'Network routing protocols (OSPF)',
      'Shortest path in weighted graphs',
      'Resource allocation with costs',
    ],
    limitations: [
      'Cannot handle negative edge weights',
      'Explores in all directions (no goal guidance)',
      'Slower than A* when a good heuristic is available',
    ],
  },
  {
    name: 'A*',
    fullName: 'A* Search Algorithm',
    description:
      'A* combines the actual cost g(n) with a heuristic estimate h(n) to form f(n) = g(n) + h(n). With an admissible heuristic (one that never overestimates), A* guarantees optimality while typically expanding fewer nodes than Dijkstra by focusing the search toward the goal.',
    timeComplexity: 'O((V + E) log V) — depends on heuristic quality',
    spaceComplexity: 'O(V)',
    optimal: 'Yes (with admissible heuristic)',
    complete: 'Yes (finite graphs with admissible heuristic)',
    usesWeights: true,
    usesHeuristic: true,
    dataStructure: 'Min-Heap Priority Queue (ordered by f = g + h)',
    pseudocode: `function AStar(graph, start, goal, h):
    pq ← MinHeap()
    pq.insert(start, h(start, goal))
    gScore ← {start: 0}
    parent ← {start: null}
    visited ← {}

    while pq is not empty:
        current ← pq.extractMin()
        if current in visited: continue
        visited.add(current)

        if current == goal:
            return reconstructPath(parent, goal)

        for each neighbor of current:
            g ← gScore[current] + weight(current, neighbor)
            if g < gScore.get(neighbor, ∞):
                gScore[neighbor] ← g
                f ← g + h(neighbor, goal)
                parent[neighbor] ← current
                pq.insert(neighbor, f)

    return "no path found"`,
    useCases: [
      'Game AI pathfinding',
      'Robot navigation',
      'Route planning with geographic heuristics',
      'Any scenario where a good heuristic is available',
    ],
    limitations: [
      'Requires a good admissible heuristic',
      'Performance degrades with poor heuristics',
      'Still O(V) space in worst case',
      'Heuristic design is problem-specific',
    ],
  },
  {
    name: 'Greedy',
    fullName: 'Greedy Best-First Search',
    description:
      'Greedy Best-First Search expands the node that appears closest to the goal based solely on the heuristic h(n). It ignores the actual cost g(n), making it fast but potentially suboptimal. It does NOT guarantee the shortest or lowest-cost path.',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    optimal: 'No',
    complete: 'Yes (finite graphs with cycle detection)',
    usesWeights: false,
    usesHeuristic: true,
    dataStructure: 'Min-Heap Priority Queue (ordered by h only)',
    pseudocode: `function GreedyBFS(graph, start, goal, h):
    pq ← MinHeap()
    pq.insert(start, h(start, goal))
    parent ← {start: null}
    visited ← {}

    while pq is not empty:
        current ← pq.extractMin()
        if current in visited: continue
        visited.add(current)

        if current == goal:
            return reconstructPath(parent, goal)

        for each neighbor of current:
            if neighbor not in visited:
                parent[neighbor] ← current
                pq.insert(neighbor, h(neighbor, goal))

    return "no path found"`,
    useCases: [
      'Quick approximate pathfinding',
      'Scenarios where speed matters more than optimality',
      'Simple heuristic-guided search',
    ],
    limitations: [
      'Does not guarantee optimal path',
      'Can be misled by the heuristic into long detours',
      'Ignores actual path cost',
      'Performance heavily depends on heuristic accuracy',
    ],
  },
];
