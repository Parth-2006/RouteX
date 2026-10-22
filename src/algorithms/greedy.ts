import { Grid, Position, AlgorithmResult } from './types';
import { getNeighbors, posKey, posEqual, manhattanDistance, reconstructPath, calculatePathCost } from './grid';
import { PriorityQueue } from './priorityQueue';

/**
 * Greedy Best-First Search
 * Expands the node that appears closest to the goal (by heuristic only).
 * Does NOT guarantee optimal paths. May find paths faster than Dijkstra
 * in some cases but can be misled by the heuristic.
 */
export function greedy(grid: Grid): AlgorithmResult {
  const { start, end } = grid;
  const visitedOrder: Position[] = [];
  let peakFrontierSize = 0;
  let nodesDiscovered = 0;

  // Handle start === end
  if (posEqual(start, end)) {
    return {
      name: 'Greedy',
      pathFound: true,
      path: [start],
      pathCost: 0,
      nodesExpanded: 0,
      nodesDiscovered: 1,
      peakFrontierSize: 1,
      executionTimeMs: 0,
      visitedOrder: [],
      guaranteesOptimal: false,
    };
  }

  const t0 = performance.now();

  const visited = new Set<string>();
  const parentMap = new Map<string, Position | null>();
  const pq = new PriorityQueue<Position>();

  const startKey = posKey(start);
  parentMap.set(startKey, null);
  pq.enqueue(start, manhattanDistance(start, end));
  nodesDiscovered = 1;

  while (!pq.isEmpty()) {
    peakFrontierSize = Math.max(peakFrontierSize, pq.size);
    const current = pq.dequeue();
    const currentKey = posKey(current);

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    visitedOrder.push(current);

    if (posEqual(current, end)) {
      const t1 = performance.now();
      const path = reconstructPath(parentMap, end);
      return {
        name: 'Greedy',
        pathFound: true,
        path,
        pathCost: calculatePathCost(grid, path),
        nodesExpanded: visitedOrder.length,
        nodesDiscovered,
        peakFrontierSize,
        executionTimeMs: t1 - t0,
        visitedOrder,
        guaranteesOptimal: false, // Greedy does NOT guarantee optimality
      };
    }

    for (const neighbor of getNeighbors(grid, current)) {
      const neighborKey = posKey(neighbor);
      if (!visited.has(neighborKey) && !parentMap.has(neighborKey)) {
        parentMap.set(neighborKey, current);
        pq.enqueue(neighbor, manhattanDistance(neighbor, end));
        nodesDiscovered++;
      }
    }
  }

  const t1 = performance.now();
  return {
    name: 'Greedy',
    pathFound: false,
    path: [],
    pathCost: 0,
    nodesExpanded: visitedOrder.length,
    nodesDiscovered,
    peakFrontierSize,
    executionTimeMs: t1 - t0,
    visitedOrder,
    guaranteesOptimal: false,
  };
}
