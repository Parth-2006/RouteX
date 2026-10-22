/**
 * Road Network Graph Types for RouteX AOA Comparison
 */

export interface RoadNode {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

export interface RoadEdge {
  to: string;
  distanceMeters: number; // Great-circle distance along road segment (always > 0)
  oneWay: boolean;
  highwayType?: string;
  name?: string;
  geometry: [number, number][]; // Dense [lat, lng] coordinates tracking road curvature
}

export interface RoadGraph {
  nodes: Map<string, RoadNode>;
  adjacency: Map<string, RoadEdge[]>;
  nodeCount: number;
  edgeCount: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  sourceName?: string;
}

export type GraphAlgorithmName = 'BFS' | 'DFS' | 'Dijkstra' | 'A*' | 'Greedy';

export interface GraphAlgorithmResult {
  algorithm: GraphAlgorithmName;
  pathFound: boolean;
  executionTimeMs: number;
  nodesExpanded: number;
  nodesDiscovered: number;
  pathNodeIds: string[];
  pathCoordinates: [number, number][]; // Dense [lat, lng] array following road curvature
  pathDistanceMeters: number; // Sum of exact edge distances along path (meters)
  edgeCount: number;
  optimalityNote: string;
}

export interface SnappedLocation {
  nodeId: string;
  node: RoadNode;
  distanceToOriginalMeters: number;
}
