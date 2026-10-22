import { Grid, Position, AlgorithmResult } from './types';
import { getNeighbors, posKey, posEqual, reconstructPath, calculatePathCost } from './grid';

/**
 * Breadth-First Search
 * Finds the shortest path in an unweighted graph (fewest edges).
 * Ignores edge weights — treats all moves as cost 1.
 * Optimal and complete for unweighted graphs.
 */
export function bfs(grid: Grid): AlgorithmResult {
  const { start, end } = grid;
  const visitedOrder: Position[] = [];
  let peakFrontierSize = 0;
  let nodesDiscovered = 0;

  // Handle start === end
  if (posEqual(start, end)) {
    return {
      name: 'BFS',
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

  const visited = new Set<string>();
  const parentMap = new Map<string, Position | null>();
  const queue: Position[] = [start];
  visited.add(posKey(start));
  parentMap.set(posKey(start), null);
  nodesDiscovered = 1;

  while (queue.length > 0) {
    peakFrontierSize = Math.max(peakFrontierSize, queue.length);
    const current = queue.shift()!;
    visitedOrder.push(current);

    if (posEqual(current, end)) {
      const t1 = performance.now();
      const path = reconstructPath(parentMap, end);
      return {
        name: 'BFS',
        pathFound: true,
        path,
        pathCost: calculatePathCost(grid, path),
        nodesExpanded: visitedOrder.length,
        nodesDiscovered,
        peakFrontierSize,
        executionTimeMs: t1 - t0,
        visitedOrder,
        guaranteesOptimal: true, // optimal for unweighted
      };
    }

    for (const neighbor of getNeighbors(grid, current)) {
      const key = posKey(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        parentMap.set(key, current);
        queue.push(neighbor);
        nodesDiscovered++;
      }
    }
  }

  const t1 = performance.now();
  return {
    name: 'BFS',
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
