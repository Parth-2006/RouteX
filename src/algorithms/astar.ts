import { Grid, Position, AlgorithmResult } from './types';
import { getNeighbors, getMoveCost, posKey, posEqual, manhattanDistance, reconstructPath, calculatePathCost } from './grid';
import { PriorityQueue } from './priorityQueue';

/**
 * A* Search Algorithm
 * Uses f(n) = g(n) + h(n) with Manhattan distance as the heuristic.
 * Manhattan distance is admissible for 4-directional grid movement with
 * unit cost, guaranteeing optimality. For weighted grids where min weight >= 1,
 * it remains admissible since h(n) never overestimates.
 * Optimal (with admissible heuristic) and complete.
 */
export function astar(grid: Grid): AlgorithmResult {
  const { start, end } = grid;
  const visitedOrder: Position[] = [];
  let peakFrontierSize = 0;
  let nodesDiscovered = 0;

  // Handle start === end
  if (posEqual(start, end)) {
    return {
      name: 'A*',
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

  const gScore = new Map<string, number>();
  const parentMap = new Map<string, Position | null>();
  const visited = new Set<string>();
  const pq = new PriorityQueue<Position>();

  const startKey = posKey(start);
  gScore.set(startKey, 0);
  parentMap.set(startKey, null);
  const h = manhattanDistance(start, end);
  pq.enqueue(start, h);
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
        name: 'A*',
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

    const currentG = gScore.get(currentKey)!;
    for (const neighbor of getNeighbors(grid, current)) {
      const neighborKey = posKey(neighbor);
      if (visited.has(neighborKey)) continue;

      const tentativeG = currentG + getMoveCost(grid, neighbor);
      const prevG = gScore.get(neighborKey);

      if (prevG === undefined || tentativeG < prevG) {
        gScore.set(neighborKey, tentativeG);
        parentMap.set(neighborKey, current);
        const f = tentativeG + manhattanDistance(neighbor, end);
        pq.enqueue(neighbor, f);
        if (prevG === undefined) {
          nodesDiscovered++;
        }
      }
    }
  }

  const t1 = performance.now();
  return {
    name: 'A*',
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
