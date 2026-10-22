import { Grid, Position, AlgorithmResult } from './types';
import { getNeighbors, getMoveCost, posKey, posEqual, reconstructPath, calculatePathCost } from './grid';
import { PriorityQueue } from './priorityQueue';

/**
 * Dijkstra's Algorithm
 * Finds the minimum-cost path for non-negative edge weights.
 * Optimal and complete.
 */
export function dijkstra(grid: Grid): AlgorithmResult {
  const { start, end } = grid;
  const visitedOrder: Position[] = [];
  let peakFrontierSize = 0;
  let nodesDiscovered = 0;

  // Handle start === end
  if (posEqual(start, end)) {
    return {
      name: 'Dijkstra',
      pathFound: true,
      path: [start],
      pathCost: 0,
      nodesExpanded: 0,
      nodesDiscovered: 1,
      peakFrontierSize: 1,
      executionTimeMs: 0,
      visitedOrder: [],
      guaranteesOptimal: true,
    };
  }

  const t0 = performance.now();

  const dist = new Map<string, number>();
  const parentMap = new Map<string, Position | null>();
  const visited = new Set<string>();
  const pq = new PriorityQueue<Position>();

  const startKey = posKey(start);
  dist.set(startKey, 0);
  parentMap.set(startKey, null);
  pq.enqueue(start, 0);
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
        name: 'Dijkstra',
        pathFound: true,
        path,
        pathCost: calculatePathCost(grid, path),
        nodesExpanded: visitedOrder.length,
        nodesDiscovered,
        peakFrontierSize,
        executionTimeMs: t1 - t0,
        visitedOrder,
        guaranteesOptimal: true,
      };
    }

    const currentDist = dist.get(currentKey)!;
    for (const neighbor of getNeighbors(grid, current)) {
      const neighborKey = posKey(neighbor);
      if (visited.has(neighborKey)) continue;

      const cost = currentDist + getMoveCost(grid, neighbor);
      const prevDist = dist.get(neighborKey);

      if (prevDist === undefined || cost < prevDist) {
        dist.set(neighborKey, cost);
        parentMap.set(neighborKey, current);
        pq.enqueue(neighbor, cost);
        if (prevDist === undefined) {
          nodesDiscovered++;
        }
      }
    }
  }

  const t1 = performance.now();
  return {
    name: 'Dijkstra',
    pathFound: false,
    path: [],
    pathCost: 0,
    nodesExpanded: visitedOrder.length,
    nodesDiscovered,
    peakFrontierSize,
    executionTimeMs: t1 - t0,
    visitedOrder,
    guaranteesOptimal: true,
  };
}
