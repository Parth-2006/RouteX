/**
 * Overpass Road Network Parser & Nearest Node Snapper
 * Converts raw OpenStreetMap elements into a typed RoadGraph with exact edge metrics and road geometry.
 */

import { RoadGraph, RoadNode, RoadEdge, SnappedLocation } from './types';
import { haversineDistanceMeters } from './haversine';

export interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

// Drivable highway categories
const DRIVABLE_HIGHWAYS = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'unclassified',
  'residential',
  'living_street',
]);

/**
 * Parses raw Overpass JSON elements into a complete RoadGraph.
 * Preserves exact node coordinates, connectivity, one-way rules, and road geometry.
 */
export function parseOverpassRoadGraph(
  data: OverpassResponse,
  sourceName = 'OpenStreetMap Overpass Live'
): RoadGraph {
  const rawNodes = new Map<string, RoadNode>();
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  // 1. Collect all valid nodes
  for (const elem of data.elements) {
    if (
      elem.type === 'node' &&
      typeof elem.lat === 'number' &&
      typeof elem.lon === 'number' &&
      isFinite(elem.lat) &&
      isFinite(elem.lon)
    ) {
      const idStr = String(elem.id);
      rawNodes.set(idStr, {
        id: idStr,
        lat: elem.lat,
        lng: elem.lon,
        name: elem.tags?.name,
      });

      if (elem.lat < minLat) minLat = elem.lat;
      if (elem.lat > maxLat) maxLat = elem.lat;
      if (elem.lon < minLng) minLng = elem.lon;
      if (elem.lon > maxLng) maxLng = elem.lon;
    }
  }

  const adjacency = new Map<string, RoadEdge[]>();
  const activeNodeIds = new Set<string>();
  let edgeCount = 0;

  // Helper to add edge with verified positive distance and road geometry
  const addEdge = (
    fromId: string,
    toId: string,
    dist: number,
    oneWay: boolean,
    geometry: [number, number][],
    hType?: string,
    name?: string
  ) => {
    // Distance must be strictly positive and finite
    if (!isFinite(dist) || dist <= 0.001) {
      return;
    }

    if (!adjacency.has(fromId)) {
      adjacency.set(fromId, []);
    }

    const existing = adjacency.get(fromId)!;
    const dup = existing.find((e) => e.to === toId);

    if (!dup) {
      existing.push({
        to: toId,
        distanceMeters: dist,
        oneWay,
        geometry,
        highwayType: hType,
        name,
      });
      activeNodeIds.add(fromId);
      activeNodeIds.add(toId);
      edgeCount++;
    } else if (dist < dup.distanceMeters) {
      // If a shorter route exists between the same node pair, update it
      dup.distanceMeters = dist;
      dup.geometry = geometry;
      if (hType) dup.highwayType = hType;
      if (name) dup.name = name;
    }
  };

  // 2. Process ways and build edges between consecutive way nodes
  for (const elem of data.elements) {
    if (elem.type === 'way' && Array.isArray(elem.nodes) && elem.nodes.length >= 2) {
      const highway = elem.tags?.highway;
      if (highway && !DRIVABLE_HIGHWAYS.has(highway)) {
        continue;
      }

      // Check one-way tags
      const onewayTag = elem.tags?.oneway;
      const isOneWayForward =
        onewayTag === 'yes' ||
        onewayTag === '1' ||
        onewayTag === 'true' ||
        highway === 'motorway' ||
        highway === 'motorway_link';
      const isOneWayBackward = onewayTag === '-1' || onewayTag === 'reverse';

      const wayName = elem.tags?.name;

      for (let i = 0; i < elem.nodes.length - 1; i++) {
        const uId = String(elem.nodes[i]);
        const vId = String(elem.nodes[i + 1]);

        if (uId === vId) continue; // Ignore zero-length self-loops

        const uNode = rawNodes.get(uId);
        const vNode = rawNodes.get(vId);

        if (uNode && vNode) {
          const dist = haversineDistanceMeters(uNode.lat, uNode.lng, vNode.lat, vNode.lng);

          if (dist > 0.01) {
            const geomForward: [number, number][] = [
              [uNode.lat, uNode.lng],
              [vNode.lat, vNode.lng],
            ];
            const geomBackward: [number, number][] = [
              [vNode.lat, vNode.lng],
              [uNode.lat, uNode.lng],
            ];

            if (isOneWayBackward) {
              addEdge(vId, uId, dist, true, geomBackward, highway, wayName);
            } else if (isOneWayForward) {
              addEdge(uId, vId, dist, true, geomForward, highway, wayName);
            } else {
              // Bidirectional street
              addEdge(uId, vId, dist, false, geomForward, highway, wayName);
              addEdge(vId, uId, dist, false, geomBackward, highway, wayName);
            }
          }
        }
      }
    }
  }

  // 3. Prune nodes that have no edges connected
  const filteredNodes = new Map<string, RoadNode>();
  for (const id of activeNodeIds) {
    const node = rawNodes.get(id);
    if (node) {
      filteredNodes.set(id, node);
    }
  }

  return {
    nodes: filteredNodes,
    adjacency,
    nodeCount: filteredNodes.size,
    edgeCount,
    bounds: {
      minLat: minLat === 90 ? 0 : minLat,
      maxLat: maxLat === -90 ? 0 : maxLat,
      minLng: minLng === 180 ? 0 : minLng,
      maxLng: maxLng === -180 ? 0 : maxLng,
    },
    sourceName,
  };
}

/**
 * Finds the nearest node in the RoadGraph to a target geographical coordinate.
 * Rejects coordinates that exceed maxSnapDistanceMeters (default 3,000m).
 */
export function findNearestRoadNode(
  graph: RoadGraph,
  targetLat: number,
  targetLng: number,
  maxSnapDistanceMeters = 3000
): SnappedLocation | null {
  if (graph.nodes.size === 0) return null;
  if (!isFinite(targetLat) || !isFinite(targetLng)) return null;

  let bestNode: RoadNode | null = null;
  let bestDistance = Infinity;

  for (const node of graph.nodes.values()) {
    const d = haversineDistanceMeters(targetLat, targetLng, node.lat, node.lng);
    if (d < bestDistance) {
      bestDistance = d;
      bestNode = node;
    }
  }

  // Strictly enforce snapping threshold: do not snap points that are in a different city or beyond the threshold!
  if (bestNode && bestDistance <= maxSnapDistanceMeters) {
    return {
      nodeId: bestNode.id,
      node: bestNode,
      distanceToOriginalMeters: bestDistance,
    };
  }

  return null;
}
