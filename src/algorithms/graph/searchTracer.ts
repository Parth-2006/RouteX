/**
 * Road Graph Search Tracer
 * Provides step-by-step observable state snapshots of graph search execution.
 * Powers the offline visualizer animations for:
 * - BFS: queue frontier, minimum hops
 * - DFS: stack frontier, deep branch exploration
 * - Dijkstra: min-priority queue ordered by accumulated distance g(n)
 * - A*: min-priority queue ordered by f(n) = g(n) + h(n)
 * - Greedy Best-First: min-priority queue ordered by heuristic h(n)
 */

import { RoadGraph, GraphAlgorithmName, GraphAlgorithmResult } from './types';
import { haversineDistanceMeters } from './haversine';
import { PriorityQueue } from '../priorityQueue';

export interface SearchFrame {
  frameIndex: number;
  currentNodeId: string | null;
  expandedNodeIds: string[];
  discoveredNodeIds: string[];
  frontierNodeIds: string[];
  exploredEdgeKeys: string[]; // Set of "u->v" strings
  finalPathNodeIds: string[];
  finalPathCoordinates: [number, number][];
  isComplete: boolean;
  statusText: string;
}

export interface SearchTrace {
  algorithm: GraphAlgorithmName;
  result: GraphAlgorithmResult;
  frames: SearchFrame[];
  totalSteps: number;
}

interface ParentInfo {
  prevNodeId: string;
  edgeDistance: number;
  edgeGeometry: [number, number][];
}

/**
 * Reconstructs the exact path from destination back to start with road curvature coordinates.
 */
function reconstructPathWithGeometry(
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
 * Builds step-by-step execution trace for any graph search algorithm.
 */
export function buildGraphSearchTrace(
  algorithm: GraphAlgorithmName,
  graph: RoadGraph,
  startNodeId: string,
  destNodeId: string,
  maxIterations = 2000
): SearchTrace {
  const t0 = performance.now();

  const startNode = graph.nodes.get(startNodeId);
  const destNode = graph.nodes.get(destNodeId);

  // Handle missing nodes
  if (!startNode || !destNode) {
    const emptyResult: GraphAlgorithmResult = {
      algorithm,
      pathFound: false,
      executionTimeMs: 0,
      nodesExpanded: 0,
      nodesDiscovered: 0,
      pathNodeIds: [],
      pathCoordinates: [],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Specified start or destination does not exist in graph.',
    };
    return {
      algorithm,
      result: emptyResult,
      frames: [
        {
          frameIndex: 0,
          currentNodeId: null,
          expandedNodeIds: [],
          discoveredNodeIds: [],
          frontierNodeIds: [],
          exploredEdgeKeys: [],
          finalPathNodeIds: [],
          finalPathCoordinates: [],
          isComplete: true,
          statusText: 'Invalid start or destination node.',
        },
      ],
      totalSteps: 1,
    };
  }

  // Handle start === destination
  if (startNodeId === destNodeId) {
    const t1 = performance.now();
    const result: GraphAlgorithmResult = {
      algorithm,
      pathFound: true,
      executionTimeMs: t1 - t0,
      nodesExpanded: 1,
      nodesDiscovered: 1,
      pathNodeIds: [startNodeId],
      pathCoordinates: [[startNode.lat, startNode.lng]],
      pathDistanceMeters: 0,
      edgeCount: 0,
      optimalityNote: 'Start and destination resolve to identical road intersection.',
    };
    const frames: SearchFrame[] = [
      {
        frameIndex: 0,
        currentNodeId: startNodeId,
        expandedNodeIds: [startNodeId],
        discoveredNodeIds: [startNodeId],
        frontierNodeIds: [],
        exploredEdgeKeys: [],
        finalPathNodeIds: [startNodeId],
        finalPathCoordinates: [[startNode.lat, startNode.lng]],
        isComplete: true,
        statusText: `Start and destination are identical (${startNode.name || startNodeId}). Route length: 0m.`,
      },
    ];
    return { algorithm, result, frames, totalSteps: 1 };
  }

  const frames: SearchFrame[] = [];
  const expandedList: string[] = [];
  const discoveredSet = new Set<string>([startNodeId]);
  const exploredEdges = new Set<string>();
  const parentMap = new Map<string, ParentInfo>();
  let reached = false;

  const getH = (nodeId: string): number => {
    const n = graph.nodes.get(nodeId);
    if (!n) return 0;
    return haversineDistanceMeters(n.lat, n.lng, destNode.lat, destNode.lng);
  };

  // Helper to record a frame
  const addFrame = (
    currNode: string | null,
    frontier: string[],
    status: string,
    complete = false,
    finalPathIds: string[] = [],
    finalPathCoords: [number, number][] = []
  ) => {
    frames.push({
      frameIndex: frames.length,
      currentNodeId: currNode,
      expandedNodeIds: [...expandedList],
      discoveredNodeIds: Array.from(discoveredSet),
      frontierNodeIds: [...frontier],
      exploredEdgeKeys: Array.from(exploredEdges),
      finalPathNodeIds: finalPathIds,
      finalPathCoordinates: finalPathCoords,
      isComplete: complete,
      statusText: status,
    });
  };

  // Initial frame
  addFrame(null, [startNodeId], `Initialized search from "${startNode.name || startNodeId}". Target: "${destNode.name || destNodeId}".`);

  // Algorithm dispatch
  if (algorithm === 'BFS') {
    const queue: string[] = [startNodeId];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0 && expandedList.length < maxIterations) {
      const curr = queue.shift()!;
      expandedList.push(curr);
      const currNodeInfo = graph.nodes.get(curr);
      const currLabel = currNodeInfo?.name || curr;

      if (curr === destNodeId) {
        reached = true;
        addFrame(curr, [...queue], `Reached destination "${currLabel}" via BFS frontier.`);
        break;
      }

      const edges = graph.adjacency.get(curr) || [];
      let newDiscoveredCount = 0;

      for (const edge of edges) {
        exploredEdges.add(`${curr}->${edge.to}`);
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          discoveredSet.add(edge.to);
          parentMap.set(edge.to, {
            prevNodeId: curr,
            edgeDistance: edge.distanceMeters,
            edgeGeometry: edge.geometry,
          });
          queue.push(edge.to);
          newDiscoveredCount++;
        }
      }

      addFrame(
        curr,
        [...queue],
        `Expanded "${currLabel}". Inspected ${edges.length} road connections (${newDiscoveredCount} newly discovered).`
      );
    }
  } else if (algorithm === 'DFS') {
    interface StackItem {
      nodeId: string;
      fromId?: string;
      edgeDist: number;
      edgeGeom: [number, number][];
    }
    const stack: StackItem[] = [{ nodeId: startNodeId, edgeDist: 0, edgeGeom: [] }];
    const visited = new Set<string>();

    while (stack.length > 0 && expandedList.length < maxIterations) {
      const item = stack.pop()!;
      if (visited.has(item.nodeId)) continue;
      visited.add(item.nodeId);
      expandedList.push(item.nodeId);

      if (item.fromId) {
        exploredEdges.add(`${item.fromId}->${item.nodeId}`);
        parentMap.set(item.nodeId, {
          prevNodeId: item.fromId,
          edgeDistance: item.edgeDist,
          edgeGeometry: item.edgeGeom,
        });
      }

      const currNodeInfo = graph.nodes.get(item.nodeId);
      const currLabel = currNodeInfo?.name || item.nodeId;

      if (item.nodeId === destNodeId) {
        reached = true;
        addFrame(item.nodeId, stack.map((s) => s.nodeId), `Destination "${currLabel}" reached via deep road branch.`);
        break;
      }

      const edges = graph.adjacency.get(item.nodeId) || [];
      for (let i = edges.length - 1; i >= 0; i--) {
        const edge = edges[i];
        if (!visited.has(edge.to)) {
          discoveredSet.add(edge.to);
          stack.push({
            nodeId: edge.to,
            fromId: item.nodeId,
            edgeDist: edge.distanceMeters,
            edgeGeom: edge.geometry,
          });
        }
      }

      addFrame(
        item.nodeId,
        stack.map((s) => s.nodeId),
        `Exploring deeply along branch from "${currLabel}" (Stack depth: ${stack.length}).`
      );
    }
  } else if (algorithm === 'Dijkstra') {
    const pq = new PriorityQueue<string>();
    const dist = new Map<string, number>();
    const visited = new Set<string>();

    dist.set(startNodeId, 0);
    pq.enqueue(startNodeId, 0);

    while (!pq.isEmpty() && expandedList.length < maxIterations) {
      const curr = pq.dequeue();
      if (visited.has(curr)) continue;
      visited.add(curr);
      expandedList.push(curr);

      const currNodeInfo = graph.nodes.get(curr);
      const currLabel = currNodeInfo?.name || curr;
      const currentDist = dist.get(curr) ?? Infinity;

      if (curr === destNodeId) {
        reached = true;
        addFrame(curr, [], `Optimal path reached at "${currLabel}" (Total distance: ${Math.round(currentDist)}m).`);
        break;
      }

      const edges = graph.adjacency.get(curr) || [];
      for (const edge of edges) {
        exploredEdges.add(`${curr}->${edge.to}`);
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
          discoveredSet.add(edge.to);
          pq.enqueue(edge.to, newDist);
        }
      }

      addFrame(
        curr,
        [],
        `Expanded "${currLabel}" (Cumulative cost g = ${Math.round(currentDist)}m).`
      );
    }
  } else if (algorithm === 'A*') {
    const pq = new PriorityQueue<string>();
    const gScore = new Map<string, number>();
    const visited = new Set<string>();

    gScore.set(startNodeId, 0);
    const initialF = getH(startNodeId);
    pq.enqueue(startNodeId, initialF);

    while (!pq.isEmpty() && expandedList.length < maxIterations) {
      const curr = pq.dequeue();
      if (visited.has(curr)) continue;
      visited.add(curr);
      expandedList.push(curr);

      const currNodeInfo = graph.nodes.get(curr);
      const currLabel = currNodeInfo?.name || curr;
      const currentG = gScore.get(curr) ?? Infinity;
      const currentH = getH(curr);

      if (curr === destNodeId) {
        reached = true;
        addFrame(curr, [], `A* reached goal "${currLabel}" with optimal distance ${Math.round(currentG)}m.`);
        break;
      }

      const edges = graph.adjacency.get(curr) || [];
      for (const edge of edges) {
        exploredEdges.add(`${curr}->${edge.to}`);
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
          discoveredSet.add(edge.to);
          const fScore = tentativeG + getH(edge.to);
          pq.enqueue(edge.to, fScore);
        }
      }

      addFrame(
        curr,
        [],
        `A* expanded "${currLabel}" (g=${Math.round(currentG)}m, h=${Math.round(currentH)}m, f=${Math.round(
          currentG + currentH
        )}m).`
      );
    }
  } else if (algorithm === 'Greedy') {
    interface PQItem {
      nodeId: string;
      fromId?: string;
      edgeDist: number;
      edgeGeom: [number, number][];
    }
    const pq = new PriorityQueue<PQItem>();
    const visited = new Set<string>();

    pq.enqueue({ nodeId: startNodeId, edgeDist: 0, edgeGeom: [] }, getH(startNodeId));

    while (!pq.isEmpty() && expandedList.length < maxIterations) {
      const item = pq.dequeue();
      if (visited.has(item.nodeId)) continue;
      visited.add(item.nodeId);
      expandedList.push(item.nodeId);

      if (item.fromId) {
        exploredEdges.add(`${item.fromId}->${item.nodeId}`);
        parentMap.set(item.nodeId, {
          prevNodeId: item.fromId,
          edgeDistance: item.edgeDist,
          edgeGeometry: item.edgeGeom,
        });
      }

      const currNodeInfo = graph.nodes.get(item.nodeId);
      const currLabel = currNodeInfo?.name || item.nodeId;
      const currH = getH(item.nodeId);

      if (item.nodeId === destNodeId) {
        reached = true;
        addFrame(item.nodeId, [], `Greedy arrived at destination "${currLabel}".`);
        break;
      }

      const edges = graph.adjacency.get(item.nodeId) || [];
      for (const edge of edges) {
        exploredEdges.add(`${item.nodeId}->${edge.to}`);
        if (!visited.has(edge.to)) {
          discoveredSet.add(edge.to);
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

      addFrame(
        item.nodeId,
        [],
        `Greedy prioritized "${currLabel}" based solely on distance-to-goal h=${Math.round(currH)}m.`
      );
    }
  }

  const t1 = performance.now();
  const pathData = reached
    ? reconstructPathWithGeometry(graph, startNodeId, destNodeId, parentMap)
    : { pathFound: false, pathNodeIds: [], pathCoordinates: [], pathDistanceMeters: 0, edgeCount: 0 };

  const optimalityNote = (() => {
    if (!pathData.pathFound) {
      return 'No route found connecting start and destination within network topology.';
    }
    switch (algorithm) {
      case 'Dijkstra':
        return 'Provably optimal minimum road distance route (guaranteed shortest).';
      case 'A*':
        return 'Provably optimal minimum distance route via admissible Haversine heuristic (f = g + h).';
      case 'BFS':
        return 'Provably optimal minimum number of edge hops (turns/intersections). May be geographically longer.';
      case 'Greedy':
        return 'Heuristic-only guidance (f = h). Fast directed search, but may take suboptimal detours.';
      case 'DFS':
        return 'Arbitrary valid connected route via deep branch exploration; neither distance nor hop optimal.';
    }
  })();

  const result: GraphAlgorithmResult = {
    algorithm,
    pathFound: pathData.pathFound,
    executionTimeMs: Math.max(0.1, Number((t1 - t0).toFixed(2))),
    nodesExpanded: expandedList.length,
    nodesDiscovered: discoveredSet.size,
    pathNodeIds: pathData.pathNodeIds,
    pathCoordinates: pathData.pathCoordinates,
    pathDistanceMeters: Math.round(pathData.pathDistanceMeters),
    edgeCount: pathData.edgeCount,
    optimalityNote,
  };

  // Final completion frame
  if (pathData.pathFound) {
    addFrame(
      destNodeId,
      [],
      `Completed! Path found: ${pathData.edgeCount} road segments (${Math.round(pathData.pathDistanceMeters)}m). ${optimalityNote}`,
      true,
      pathData.pathNodeIds,
      pathData.pathCoordinates
    );
  } else {
    addFrame(
      null,
      [],
      `Search ended. Destination unreachable from this start point in this road network.`,
      true,
      [],
      []
    );
  }

  return {
    algorithm,
    result,
    frames,
    totalSteps: frames.length,
  };
}
