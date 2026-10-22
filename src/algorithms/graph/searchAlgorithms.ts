/**
 * Real Road Graph Search Algorithms: BFS, DFS, Dijkstra, A*, and Greedy Best-First Search.
 * All algorithms operate on the exact same RoadGraph instance from the same start to destination node.
 * Preserves dense road geometry along traversed edges, strictly calculates verified path distances,
 * and handles one-way restrictions, disconnected components, and edge cases honestly.
 */

import { RoadGraph, GraphAlgorithmResult, GraphAlgorithmName } from './types';
import { haversineDistanceMeters } from './haversine';
import { PriorityQueue } from '../priorityQueue';

interface ParentInfo {
  prevNodeId: string;
  edgeDistance: number;
  edgeGeometry: [number, number][];
}

/**
 * Reconstructs the path from destination back to start.
 * Combines exact road segment geometries, avoiding straight-line shortcuts across city blocks.
 */
function reconstructPath(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string,
  parentMap: Map<string, ParentInfo>
): {
  pathFound: boolean;
  pathNodeIds: string[];
  pathCoordinates: [number, number][];
  pathDistanceMeters: number;
  edgeCount: number;
} {
  if (startNodeId === destNodeId) {
    const node = graph.nodes.get(startNodeId);
    return {
      pathFound: true,
      pathNodeIds: [startNodeId],
      pathCoordinates: node ? [[node.lat, node.lng]] : [],
      pathDistanceMeters: 0,
      edgeCount: 0,
    };
  }

  const edgeSegments: ParentInfo[] = [];
  const pathNodeIds: string[] = [destNodeId];
  let curr = destNodeId;
  let totalDistance = 0;

  while (curr !== startNodeId) {
    const p = parentMap.get(curr);
    if (!p) {
      // Disconnected: cannot complete path back to start
      return {
        pathFound: false,
        pathNodeIds: [],
        pathCoordinates: [],
        pathDistanceMeters: 0,
        edgeCount: 0,
      };
    }

    totalDistance += p.edgeDistance;
    edgeSegments.push(p);
    curr = p.prevNodeId;
    pathNodeIds.push(curr);
  }

  pathNodeIds.reverse();
  edgeSegments.reverse();

  // Assemble dense road geometry by stitching edge geometries together in forward order
  const pathCoordinates: [number, number][] = [];

  for (let i = 0; i < edgeSegments.length; i++) {
    const seg = edgeSegments[i];
    const geom =
      seg.edgeGeometry && seg.edgeGeometry.length > 0
        ? seg.edgeGeometry
        : (() => {
            const u = graph.nodes.get(seg.prevNodeId);
            const v = graph.nodes.get(pathNodeIds[i + 1]);
            return u && v ? ([[u.lat, u.lng], [v.lat, v.lng]] as [number, number][]) : [];
          })();

    if (i === 0) {
      pathCoordinates.push(...geom);
    } else {
      // Skip the first coordinate if it matches the last coordinate of previous segment to prevent duplicate points
      const lastCoord = pathCoordinates[pathCoordinates.length - 1];
      const startIndex =
        geom.length > 0 &&
        lastCoord &&
        Math.abs(geom[0][0] - lastCoord[0]) < 1e-7 &&
        Math.abs(geom[0][1] - lastCoord[1]) < 1e-7
          ? 1
          : 0;

      for (let j = startIndex; j < geom.length; j++) {
        pathCoordinates.push(geom[j]);
      }
    }
  }

  return {
    pathFound: true,
    pathNodeIds,
    pathCoordinates,
    pathDistanceMeters: totalDistance,
    edgeCount: Math.max(0, pathNodeIds.length - 1),
  };
}

/**
 * 1. BREADTH-FIRST SEARCH (BFS)
 * Explores in order of edge hops.
 * Guaranteed to find the path with the MINIMUM NUMBER OF EDGES (hops),
 * but does NOT necessarily minimize geographic distance on weighted road networks.
 */
export function runGraphBFS(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string
): GraphAlgorithmResult {
  const t0 = performance.now();
  let nodesExpanded = 0;
  let nodesDiscovered = 1;

  if (startNodeId === destNodeId) {
    const t1 = performance.now();
    const node = graph.nodes.get(startNodeId);
    return {
      algorithm: 'BFS',
      pathFound: true,
      executionTimeMs: t1 - t0,
      nodesExpanded: 1,
      nodesDiscovered: 1,
      pathNodeIds: [startNodeId],
      pathCoordinates: node ? [[node.lat, node.lng]] : [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Start and destination resolve to the identical road node.',
    };
  }

  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  const parentMap = new Map<string, ParentInfo>();
  let reached = false;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    nodesExpanded++;

    if (curr === destNodeId) {
      reached = true;
      break;
    }

    const edges = graph.adjacency.get(curr) || [];
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        nodesDiscovered++;
        parentMap.set(edge.to, {
          prevNodeId: curr,
          edgeDistance: edge.distanceMeters,
          edgeGeometry: edge.geometry,
        });
        queue.push(edge.to);
      }
    }
  }

  const t1 = performance.now();
  const pathData = reached
    ? reconstructPath(graph, startNodeId, destNodeId, parentMap)
    : { pathFound: false, pathNodeIds: [], pathCoordinates: [], pathDistanceMeters: 0, edgeCount: 0 };

  return {
    algorithm: 'BFS',
    pathFound: pathData.pathFound,
    executionTimeMs: t1 - t0,
    nodesExpanded,
    nodesDiscovered,
    pathNodeIds: pathData.pathNodeIds,
    pathCoordinates: pathData.pathCoordinates,
    pathDistanceMeters: pathData.pathDistanceMeters,
    edgeCount: pathData.edgeCount,
    optimalityNote: pathData.pathFound
      ? 'Optimal in edge count (minimum hops/turns). May be geographically longer than Dijkstra/A*.'
      : 'No route found connecting start and destination within graph.',
  };
}

/**
 * 2. DEPTH-FIRST SEARCH (DFS)
 * Explores deeply along each road branch before backtracking.
 * Uses stack tracking to guarantee continuous road-following edge reconstruction.
 * Does NOT guarantee optimal distance or hop count.
 */
export function runGraphDFS(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string,
  maxIterations = 50000
): GraphAlgorithmResult {
  const t0 = performance.now();
  let nodesExpanded = 0;
  let nodesDiscovered = 1;

  if (startNodeId === destNodeId) {
    const t1 = performance.now();
    const node = graph.nodes.get(startNodeId);
    return {
      algorithm: 'DFS',
      pathFound: true,
      executionTimeMs: t1 - t0,
      nodesExpanded: 1,
      nodesDiscovered: 1,
      pathNodeIds: [startNodeId],
      pathCoordinates: node ? [[node.lat, node.lng]] : [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Start and destination resolve to the identical road node.',
    };
  }

  interface StackItem {
    nodeId: string;
    fromId?: string;
    edgeDist: number;
    edgeGeom: [number, number][];
  }

  const stack: StackItem[] = [
    { nodeId: startNodeId, edgeDist: 0, edgeGeom: [] },
  ];
  const visited = new Set<string>();
  const parentMap = new Map<string, ParentInfo>();
  let reached = false;

  while (stack.length > 0 && nodesExpanded < maxIterations) {
    const item = stack.pop()!;
    if (visited.has(item.nodeId)) continue;

    visited.add(item.nodeId);
    nodesExpanded++;

    if (item.fromId) {
      parentMap.set(item.nodeId, {
        prevNodeId: item.fromId,
        edgeDistance: item.edgeDist,
        edgeGeometry: item.edgeGeom,
      });
    }

    if (item.nodeId === destNodeId) {
      reached = true;
      break;
    }

    const edges = graph.adjacency.get(item.nodeId) || [];
    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
      if (!visited.has(edge.to)) {
        nodesDiscovered++;
        stack.push({
          nodeId: edge.to,
          fromId: item.nodeId,
          edgeDist: edge.distanceMeters,
          edgeGeom: edge.geometry,
        });
      }
    }
  }

  const t1 = performance.now();
  const pathData = reached
    ? reconstructPath(graph, startNodeId, destNodeId, parentMap)
    : { pathFound: false, pathNodeIds: [], pathCoordinates: [], pathDistanceMeters: 0, edgeCount: 0 };

  return {
    algorithm: 'DFS',
    pathFound: pathData.pathFound,
    executionTimeMs: t1 - t0,
    nodesExpanded,
    nodesDiscovered,
    pathNodeIds: pathData.pathNodeIds,
    pathCoordinates: pathData.pathCoordinates,
    pathDistanceMeters: pathData.pathDistanceMeters,
    edgeCount: pathData.edgeCount,
    optimalityNote: pathData.pathFound
      ? 'Arbitrary valid connected path. Deep unweighted exploration; not optimal for distance or hops.'
      : nodesExpanded >= maxIterations
      ? 'Search iteration safety limit reached without finding destination.'
      : 'No route found connecting start and destination within graph.',
  };
}

/**
 * 3. DIJKSTRA'S ALGORITHM
 * Uses a min-priority queue ordered by accumulated distance g(n).
 * Provably finds the MINIMUM GEOGRAPHIC DISTANCE path for non-negative edge costs.
 */
export function runGraphDijkstra(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string
): GraphAlgorithmResult {
  const t0 = performance.now();
  let nodesExpanded = 0;
  let nodesDiscovered = 1;

  if (startNodeId === destNodeId) {
    const t1 = performance.now();
    const node = graph.nodes.get(startNodeId);
    return {
      algorithm: 'Dijkstra',
      pathFound: true,
      executionTimeMs: t1 - t0,
      nodesExpanded: 1,
      nodesDiscovered: 1,
      pathNodeIds: [startNodeId],
      pathCoordinates: node ? [[node.lat, node.lng]] : [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Start and destination resolve to the identical road node.',
    };
  }

  const pq = new PriorityQueue<string>();
  const dist = new Map<string, number>();
  const visited = new Set<string>();
  const parentMap = new Map<string, ParentInfo>();

  dist.set(startNodeId, 0);
  pq.enqueue(startNodeId, 0);
  let reached = false;

  while (!pq.isEmpty()) {
    const curr = pq.dequeue();
    if (visited.has(curr)) continue;
    visited.add(curr);
    nodesExpanded++;

    if (curr === destNodeId) {
      reached = true;
      break;
    }

    const currentDist = dist.get(curr) ?? Infinity;
    const edges = graph.adjacency.get(curr) || [];

    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      const newDist = currentDist + edge.distanceMeters;
      const oldDist = dist.get(edge.to) ?? Infinity;

      if (newDist < oldDist) {
        dist.set(edge.to, newDist);
        parentMap.set(edge.to, {
          prevNodeId: curr,
          edgeDistance: edge.distanceMeters,
          edgeGeometry: edge.geometry,
        });
        nodesDiscovered++;
        pq.enqueue(edge.to, newDist);
      }
    }
  }

  const t1 = performance.now();
  const pathData = reached
    ? reconstructPath(graph, startNodeId, destNodeId, parentMap)
    : { pathFound: false, pathNodeIds: [], pathCoordinates: [], pathDistanceMeters: 0, edgeCount: 0 };

  return {
    algorithm: 'Dijkstra',
    pathFound: pathData.pathFound,
    executionTimeMs: t1 - t0,
    nodesExpanded,
    nodesDiscovered,
    pathNodeIds: pathData.pathNodeIds,
    pathCoordinates: pathData.pathCoordinates,
    pathDistanceMeters: pathData.pathDistanceMeters,
    edgeCount: pathData.edgeCount,
    optimalityNote: pathData.pathFound
      ? 'Provably optimal minimum geographic distance route.'
      : 'No route found connecting start and destination within graph.',
  };
}

/**
 * 4. A* SEARCH (A-STAR)
 * Uses f(n) = g(n) + h(n), where h(n) is the Haversine straight-line distance to destination.
 * Since straight-line distance <= road distance, h(n) is strictly admissible and consistent.
 * Provably finds the OPTIMAL MINIMUM DISTANCE route with substantially fewer node expansions.
 */
export function runGraphAStar(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string
): GraphAlgorithmResult {
  const t0 = performance.now();
  let nodesExpanded = 0;
  let nodesDiscovered = 1;

  if (startNodeId === destNodeId) {
    const t1 = performance.now();
    const node = graph.nodes.get(startNodeId);
    return {
      algorithm: 'A*',
      pathFound: true,
      executionTimeMs: t1 - t0,
      nodesExpanded: 1,
      nodesDiscovered: 1,
      pathNodeIds: [startNodeId],
      pathCoordinates: node ? [[node.lat, node.lng]] : [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Start and destination resolve to the identical road node.',
    };
  }

  const destNode = graph.nodes.get(destNodeId);
  if (!destNode) {
    return {
      algorithm: 'A*',
      pathFound: false,
      executionTimeMs: 0,
      nodesExpanded: 0,
      nodesDiscovered: 0,
      pathNodeIds: [],
      pathCoordinates: [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Destination node does not exist in graph.',
    };
  }

  const getH = (nodeId: string): number => {
    const n = graph.nodes.get(nodeId);
    if (!n) return 0;
    return haversineDistanceMeters(n.lat, n.lng, destNode.lat, destNode.lng);
  };

  const pq = new PriorityQueue<string>();
  const gScore = new Map<string, number>();
  const visited = new Set<string>();
  const parentMap = new Map<string, ParentInfo>();

  gScore.set(startNodeId, 0);
  const initialF = getH(startNodeId);
  pq.enqueue(startNodeId, initialF);
  let reached = false;

  while (!pq.isEmpty()) {
    const curr = pq.dequeue();
    if (visited.has(curr)) continue;
    visited.add(curr);
    nodesExpanded++;

    if (curr === destNodeId) {
      reached = true;
      break;
    }

    const currentG = gScore.get(curr) ?? Infinity;
    const edges = graph.adjacency.get(curr) || [];

    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      const tentativeG = currentG + edge.distanceMeters;
      const oldG = gScore.get(edge.to) ?? Infinity;

      if (tentativeG < oldG) {
        gScore.set(edge.to, tentativeG);
        parentMap.set(edge.to, {
          prevNodeId: curr,
          edgeDistance: edge.distanceMeters,
          edgeGeometry: edge.geometry,
        });
        nodesDiscovered++;
        const fScore = tentativeG + getH(edge.to);
        pq.enqueue(edge.to, fScore);
      }
    }
  }

  const t1 = performance.now();
  const pathData = reached
    ? reconstructPath(graph, startNodeId, destNodeId, parentMap)
    : { pathFound: false, pathNodeIds: [], pathCoordinates: [], pathDistanceMeters: 0, edgeCount: 0 };

  return {
    algorithm: 'A*',
    pathFound: pathData.pathFound,
    executionTimeMs: t1 - t0,
    nodesExpanded,
    nodesDiscovered,
    pathNodeIds: pathData.pathNodeIds,
    pathCoordinates: pathData.pathCoordinates,
    pathDistanceMeters: pathData.pathDistanceMeters,
    edgeCount: pathData.edgeCount,
    optimalityNote: pathData.pathFound
      ? 'Optimal minimum distance route via admissible Haversine heuristic (f = g + h).'
      : 'No route found connecting start and destination within graph.',
  };
}

/**
 * 5. GREEDY BEST-FIRST SEARCH
 * Uses solely h(n) (Haversine distance to destination) as its priority.
 * Fast directed search towards goal, but does NOT guarantee optimal route.
 */
export function runGraphGreedy(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string
): GraphAlgorithmResult {
  const t0 = performance.now();
  let nodesExpanded = 0;
  let nodesDiscovered = 1;

  if (startNodeId === destNodeId) {
    const t1 = performance.now();
    const node = graph.nodes.get(startNodeId);
    return {
      algorithm: 'Greedy',
      pathFound: true,
      executionTimeMs: t1 - t0,
      nodesExpanded: 1,
      nodesDiscovered: 1,
      pathNodeIds: [startNodeId],
      pathCoordinates: node ? [[node.lat, node.lng]] : [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Start and destination resolve to the identical road node.',
    };
  }

  const destNode = graph.nodes.get(destNodeId);
  if (!destNode) {
    return {
      algorithm: 'Greedy',
      pathFound: false,
      executionTimeMs: 0,
      nodesExpanded: 0,
      nodesDiscovered: 0,
      pathNodeIds: [],
      pathCoordinates: [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Destination node does not exist in graph.',
    };
  }

  const getH = (nodeId: string): number => {
    const n = graph.nodes.get(nodeId);
    if (!n) return 0;
    return haversineDistanceMeters(n.lat, n.lng, destNode.lat, destNode.lng);
  };

  interface PQItem {
    nodeId: string;
    fromId?: string;
    edgeDist: number;
    edgeGeom: [number, number][];
  }

  const pq = new PriorityQueue<PQItem>();
  const visited = new Set<string>();
  const parentMap = new Map<string, ParentInfo>();

  pq.enqueue(
    { nodeId: startNodeId, edgeDist: 0, edgeGeom: [] },
    getH(startNodeId)
  );
  let reached = false;

  while (!pq.isEmpty()) {
    const item = pq.dequeue();
    if (visited.has(item.nodeId)) continue;

    visited.add(item.nodeId);
    nodesExpanded++;

    if (item.fromId) {
      parentMap.set(item.nodeId, {
        prevNodeId: item.fromId,
        edgeDistance: item.edgeDist,
        edgeGeometry: item.edgeGeom,
      });
    }

    if (item.nodeId === destNodeId) {
      reached = true;
      break;
    }

    const edges = graph.adjacency.get(item.nodeId) || [];
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        nodesDiscovered++;
        pq.enqueue(
          {
            nodeId: edge.to,
            fromId: item.nodeId,
            edgeDist: edge.distanceMeters,
            edgeGeom: edge.geometry,
          },
          getH(edge.to)
        );
      }
    }
  }

  const t1 = performance.now();
  const pathData = reached
    ? reconstructPath(graph, startNodeId, destNodeId, parentMap)
    : { pathFound: false, pathNodeIds: [], pathCoordinates: [], pathDistanceMeters: 0, edgeCount: 0 };

  return {
    algorithm: 'Greedy',
    pathFound: pathData.pathFound,
    executionTimeMs: t1 - t0,
    nodesExpanded,
    nodesDiscovered,
    pathNodeIds: pathData.pathNodeIds,
    pathCoordinates: pathData.pathCoordinates,
    pathDistanceMeters: pathData.pathDistanceMeters,
    edgeCount: pathData.edgeCount,
    optimalityNote: pathData.pathFound
      ? 'Heuristic-only guidance (f = h). Fast directed search, but may take suboptimal detours.'
      : 'No route found connecting start and destination within graph.',
  };
}

/**
 * Executes all 5 graph algorithms on the identical road graph snapshot and start/destination nodes.
 */
export function runAllGraphAlgorithms(
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string
): Record<GraphAlgorithmName, GraphAlgorithmResult> {
  return {
    Dijkstra: runGraphDijkstra(graph, startNodeId, destNodeId),
    'A*': runGraphAStar(graph, startNodeId, destNodeId),
    BFS: runGraphBFS(graph, startNodeId, destNodeId),
    Greedy: runGraphGreedy(graph, startNodeId, destNodeId),
    DFS: runGraphDFS(graph, startNodeId, destNodeId),
  };
}
