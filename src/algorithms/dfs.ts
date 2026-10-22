import { Grid, Position, AlgorithmResult } from './types';
import { getNeighbors, posKey, posEqual, reconstructPath, calculatePathCost } from './grid';

/**
 * Depth-First Search
 * Explores as deep as possible before backtracking.
 * Does NOT guarantee the shortest or lowest-cost path.
 * Complete on finite graphs (with cycle detection).
 */
export function dfs(grid: Grid): AlgorithmResult {
  const { start, end } = grid;
  const visitedOrder: Position[] = [];
  let peakFrontierSize = 0;
  let nodesDiscovered = 0;

  // Handle start === end
  if (posEqual(start, end)) {
    return {
      name: 'DFS',
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
  const stack: Position[] = [start];
  parentMap.set(posKey(start), null);
  nodesDiscovered = 1;

  while (stack.length > 0) {
    peakFrontierSize = Math.max(peakFrontierSize, stack.length);
    const current = stack.pop()!;
    const currentKey = posKey(current);

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    visitedOrder.push(current);

    if (posEqual(current, end)) {
      const t1 = performance.now();
      const path = reconstructPath(parentMap, end);
      return {
        name: 'DFS',
        pathFound: true,
        path,
        pathCost: calculatePathCost(grid, path),
        nodesExpanded: visitedOrder.length,
        nodesDiscovered,
        peakFrontierSize,
        executionTimeMs: t1 - t0,
        visitedOrder,
        guaranteesOptimal: false, // DFS does NOT guarantee optimal paths
      };
    }

    const neighbors = getNeighbors(grid, current);
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      if (!visited.has(key)) {
        if (!parentMap.has(key)) {
          parentMap.set(key, current);
          nodesDiscovered++;
        }
        stack.push(neighbor);
      }
    }
  }

  const t1 = performance.now();
  return {
    name: 'DFS',
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
