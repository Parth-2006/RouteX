import { describe, it, expect } from 'vitest';
import {
  RoadGraph,
  RoadNode,
  RoadEdge,
  haversineDistanceMeters,
  runGraphBFS,
  runGraphDFS,
  runGraphDijkstra,
  runGraphAStar,
  runGraphGreedy,
  runAllGraphAlgorithms,
  findNearestRoadNode,
  parseOverpassRoadGraph,
  CENTRAL_LONDON_ROAD_GRAPH,
  MANHATTAN_ROAD_GRAPH,
  SOUTH_MUMBAI_ROAD_GRAPH,
} from '../algorithms/graph';

// Helper to construct a deterministic test graph
function createSyntheticRoadGraph(): RoadGraph {
  // Nodes placed with known geographic distances (~220m apart)
  const nodes = new Map<string, RoadNode>([
    ['N0', { id: 'N0', lat: 10.000, lng: 20.000, name: 'Start' }],
    ['N1', { id: 'N1', lat: 10.002, lng: 20.000, name: 'North Node' }],
    ['N2', { id: 'N2', lat: 10.000, lng: 20.002, name: 'East Node' }],
    ['N3', { id: 'N3', lat: 10.002, lng: 20.002, name: 'Destination' }],
    ['ISOLATED', { id: 'ISOLATED', lat: 10.010, lng: 20.010, name: 'Unreachable Island' }],
  ]);

  const adjacency = new Map<string, RoadEdge[]>();

  const add = (u: string, v: string, dist: number, oneWay: boolean, customGeom?: [number, number][]) => {
    const uNode = nodes.get(u)!;
    const vNode = nodes.get(v)!;
    const forwardGeom: [number, number][] =
      customGeom || [
        [uNode.lat, uNode.lng],
        [vNode.lat, vNode.lng],
      ];

    if (!adjacency.has(u)) adjacency.set(u, []);
    adjacency.get(u)!.push({ to: v, distanceMeters: dist, oneWay, geometry: forwardGeom });

    if (!oneWay) {
      if (!adjacency.has(v)) adjacency.set(v, []);
      adjacency.get(v)!.push({
        to: u,
        distanceMeters: dist,
        oneWay: false,
        geometry: forwardGeom.slice().reverse(),
      });
    }
  };

  // Route 1 (via N1): N0 -> N1 (400m), N1 -> N3 (400m) => total 800m (2 edges) - Shortest distance path!
  add('N0', 'N1', 400, false);
  add('N1', 'N3', 400, false);

  // Route 2 (via N2): N0 -> N2 (300m), N2 -> N3 (900m) => total 1200m (2 edges)
  add('N0', 'N2', 300, false);
  add('N2', 'N3', 900, false);

  // Direct long edge N0 -> N3 (1 edge, but 1500m) - Minimum edges, but longest distance!
  // Includes intermediate curvature points to test dense geometry
  add('N0', 'N3', 1500, false, [
    [10.0, 20.0],
    [10.001, 20.0005],
    [10.0015, 20.001],
    [10.002, 20.002],
  ]);

  return {
    nodes,
    adjacency,
    nodeCount: nodes.size,
    edgeCount: 6,
    bounds: { minLat: 10.0, maxLat: 10.01, minLng: 20.0, maxLng: 20.01 },
    sourceName: 'Synthetic Verification Graph',
  };
}

describe('1. Haversine Metric & Road Distance Calculations', () => {
  it('correctly calculates zero distance for identical coordinates', () => {
    expect(haversineDistanceMeters(51.5074, -0.1278, 51.5074, -0.1278)).toBe(0);
  });

  it('calculates known geographic distance accurately (London to Paris ~343 km)', () => {
    const dist = haversineDistanceMeters(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(340000);
    expect(dist).toBeLessThan(346000);
  });

  it('verifies all road graph edges have strictly positive finite distances (> 0)', () => {
    const graphs = [CENTRAL_LONDON_ROAD_GRAPH, MANHATTAN_ROAD_GRAPH, SOUTH_MUMBAI_ROAD_GRAPH];
    for (const g of graphs) {
      for (const [fromId, edges] of g.adjacency.entries()) {
        for (const edge of edges) {
          expect(isFinite(edge.distanceMeters)).toBe(true);
          expect(edge.distanceMeters).toBeGreaterThan(0.01);
          expect(edge.to).not.toBe(fromId); // No zero-length self-loops
          expect(edge.geometry.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe('2. Road Graph Snapping & Boundary Constraints', () => {
  it('snaps coordinates to the nearest road-graph node within threshold', () => {
    const graph = CENTRAL_LONDON_ROAD_GRAPH;
    // Near Trafalgar Square
    const snapped = findNearestRoadNode(graph, 51.5081, -0.128);
    expect(snapped).not.toBeNull();
    expect(snapped?.nodeId).toBe('lon-trafalgar-square');
    expect(snapped?.distanceToOriginalMeters).toBeLessThan(50);
  });

  it('rejects snapping when coordinates exceed maxSnapDistanceMeters threshold', () => {
    const graph = CENTRAL_LONDON_ROAD_GRAPH;
    // Coordinates in Tokyo (thousands of km away from London)
    const tokyoSnap = findNearestRoadNode(graph, 35.6762, 139.6503, 3000);
    expect(tokyoSnap).toBeNull();

    // Coordinates in the Atlantic Ocean (50 km away from London)
    const oceanSnap = findNearestRoadNode(graph, 51.0, 0.5, 3000);
    expect(oceanSnap).toBeNull();
  });

  it('gracefully handles empty graph or invalid coordinates', () => {
    const emptyGraph: RoadGraph = {
      nodes: new Map(),
      adjacency: new Map(),
      nodeCount: 0,
      edgeCount: 0,
      bounds: { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 },
    };
    expect(findNearestRoadNode(emptyGraph, 51.5, -0.1)).toBeNull();
    expect(findNearestRoadNode(CENTRAL_LONDON_ROAD_GRAPH, NaN, Infinity)).toBeNull();
  });
});

describe('3. Graph Algorithm Correctness on Deterministic Synthetic Graph', () => {
  const graph = createSyntheticRoadGraph();

  it('BFS finds the path with the minimum number of edges (1 edge)', () => {
    const res = runGraphBFS(graph, 'N0', 'N3');
    expect(res.pathFound).toBe(true);
    // Direct N0 -> N3 is 1 edge (1500m)
    expect(res.edgeCount).toBe(1);
    expect(res.pathNodeIds).toEqual(['N0', 'N3']);
    expect(res.pathDistanceMeters).toBe(1500);
  });

  it('Dijkstra finds the provably minimum-distance route (800m)', () => {
    const res = runGraphDijkstra(graph, 'N0', 'N3');
    expect(res.pathFound).toBe(true);
    expect(res.pathDistanceMeters).toBe(800);
    expect(res.pathNodeIds).toEqual(['N0', 'N1', 'N3']);
    expect(res.edgeCount).toBe(2);
  });

  it('A* finds the exact same optimal distance as Dijkstra (800m)', () => {
    const astarRes = runGraphAStar(graph, 'N0', 'N3');
    const dijkstraRes = runGraphDijkstra(graph, 'N0', 'N3');
    expect(astarRes.pathFound).toBe(true);
    expect(astarRes.pathDistanceMeters).toBe(800);
    expect(astarRes.pathDistanceMeters).toBe(dijkstraRes.pathDistanceMeters);
    expect(astarRes.pathNodeIds).toEqual(dijkstraRes.pathNodeIds);
  });

  it('Greedy Best-First reaches destination using heuristic guidance', () => {
    const res = runGraphGreedy(graph, 'N0', 'N3');
    expect(res.pathFound).toBe(true);
    expect(res.pathNodeIds[0]).toBe('N0');
    expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe('N3');
    expect(res.pathDistanceMeters).toBeGreaterThan(0);
  });

  it('DFS finds a valid continuous path without assuming optimality', () => {
    const res = runGraphDFS(graph, 'N0', 'N3');
    expect(res.pathFound).toBe(true);
    expect(res.pathNodeIds[0]).toBe('N0');
    expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe('N3');

    // Verify path continuity across every single consecutive hop
    for (let i = 0; i < res.pathNodeIds.length - 1; i++) {
      const u = res.pathNodeIds[i];
      const v = res.pathNodeIds[i + 1];
      const edges = graph.adjacency.get(u) || [];
      expect(edges.some((e) => e.to === v)).toBe(true);
    }
  });

  it('handles identical start and destination nodes (pathDistance = 0, edgeCount = 0)', () => {
    const res = runGraphDijkstra(graph, 'N0', 'N0');
    expect(res.pathFound).toBe(true);
    expect(res.pathDistanceMeters).toBe(0);
    expect(res.edgeCount).toBe(0);
    expect(res.pathNodeIds).toEqual(['N0']);
    expect(res.pathCoordinates).toEqual([[10.0, 20.0]]);
  });

  it('reports pathFound: false for unreachable isolated nodes without inventing routes', () => {
    const res = runGraphDijkstra(graph, 'N0', 'ISOLATED');
    expect(res.pathFound).toBe(false);
    expect(res.pathNodeIds.length).toBe(0);
    expect(res.pathCoordinates.length).toBe(0);
    expect(res.pathDistanceMeters).toBe(0);
    expect(res.edgeCount).toBe(0);
  });

  it('verifies that reported pathDistance equals the exact sum of edge costs in the path', () => {
    const res = runGraphDijkstra(graph, 'N0', 'N3');
    let sumEdges = 0;
    for (let i = 0; i < res.pathNodeIds.length - 1; i++) {
      const u = res.pathNodeIds[i];
      const v = res.pathNodeIds[i + 1];
      const edge = (graph.adjacency.get(u) || []).find((e) => e.to === v);
      expect(edge).toBeDefined();
      sumEdges += edge!.distanceMeters;
    }
    expect(res.pathDistanceMeters).toBe(sumEdges);
  });
});

describe('4. Road Curvature & Leaflet Polyline Geometry Preservation', () => {
  const graph = createSyntheticRoadGraph();

  it('preserves dense intermediate shape points along curved edges in BFS route', () => {
    const res = runGraphBFS(graph, 'N0', 'N3');
    expect(res.pathFound).toBe(true);
    // 1 edge hop with 4 dense coordinates
    expect(res.edgeCount).toBe(1);
    expect(res.pathNodeIds.length).toBe(2);
    expect(res.pathCoordinates.length).toBe(4);
    expect(res.pathCoordinates[0]).toEqual([10.0, 20.0]);
    expect(res.pathCoordinates[3]).toEqual([10.002, 20.002]);
  });

  it('verifies all polyline coordinates follow Leaflet [latitude, longitude] ordering', () => {
    const results = runAllGraphAlgorithms(CENTRAL_LONDON_ROAD_GRAPH, 'lon-hyde-park-corner', 'lon-bank');
    for (const res of Object.values(results)) {
      expect(res.pathFound).toBe(true);
      for (const [lat, lng] of res.pathCoordinates) {
        // Central London coordinates: lat ~51.5, lng ~ -0.1
        expect(lat).toBeGreaterThan(51.4);
        expect(lat).toBeLessThan(51.6);
        expect(lng).toBeGreaterThan(-0.25);
        expect(lng).toBeLessThan(0.05);
      }
    }
  });

  it('seamlessly deduplicates adjoining segment endpoints without dropping shape points', () => {
    const res = runGraphDijkstra(graph, 'N0', 'N3');
    expect(res.pathFound).toBe(true);
    // N0 -> N1 (2 pts) + N1 -> N3 (2 pts) joined seamlessly = 3 coordinates
    expect(res.pathCoordinates.length).toBe(3);
    expect(res.pathCoordinates[0]).toEqual([10.0, 20.0]);
    expect(res.pathCoordinates[1]).toEqual([10.002, 20.0]);
    expect(res.pathCoordinates[2]).toEqual([10.002, 20.002]);
  });
});

describe('5. One-Way Road Restrictions Enforcement', () => {
  it('strictly respects one-way road directions', () => {
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', lat: 0, lng: 0 }],
      ['B', { id: 'B', lat: 0, lng: 0.01 }],
    ]);
    const adjacency = new Map<string, RoadEdge[]>([
      [
        'A',
        [
          {
            to: 'B',
            distanceMeters: 100,
            oneWay: true,
            geometry: [
              [0, 0],
              [0, 0.01],
            ],
          },
        ],
      ],
    ]);
    const oneWayGraph: RoadGraph = {
      nodes,
      adjacency,
      nodeCount: 2,
      edgeCount: 1,
      bounds: { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0.01 },
    };

    // A to B should succeed
    const forward = runGraphDijkstra(oneWayGraph, 'A', 'B');
    expect(forward.pathFound).toBe(true);

    // B to A must fail due to one-way restriction
    const reverse = runGraphDijkstra(oneWayGraph, 'B', 'A');
    expect(reverse.pathFound).toBe(false);
  });

  it('enforces Regent Street one-way northbound restriction in Central London', () => {
    // Regent St runs northbound: lon-piccadilly-circus -> lon-oxford-circus
    const north = runGraphDijkstra(CENTRAL_LONDON_ROAD_GRAPH, 'lon-piccadilly-circus', 'lon-oxford-circus');
    expect(north.pathFound).toBe(true);

    // In reverse (Oxford Circus -> Piccadilly Circus direct via Regent St) is impossible;
    // must take an alternate route or detours
    const south = runGraphDijkstra(CENTRAL_LONDON_ROAD_GRAPH, 'lon-oxford-circus', 'lon-piccadilly-circus');
    expect(south.pathFound).toBe(true);
    // Reverse route cannot simply be the reverse of the one-way Regent St edge
    expect(south.pathNodeIds).not.toEqual(['lon-oxford-circus', 'lon-piccadilly-circus']);
  });
});

describe('6. Real-World OSM Road Graphs (London, Manhattan, Mumbai)', () => {
  it('executes all 5 algorithms on Central London OSM network (Hyde Park to Bank)', () => {
    const results = runAllGraphAlgorithms(
      CENTRAL_LONDON_ROAD_GRAPH,
      'lon-hyde-park-corner',
      'lon-bank'
    );

    expect(results.Dijkstra.pathFound).toBe(true);
    expect(results['A*'].pathFound).toBe(true);
    expect(results.BFS.pathFound).toBe(true);
    expect(results.Greedy.pathFound).toBe(true);
    expect(results.DFS.pathFound).toBe(true);

    // Dijkstra and A* must match optimal distance exactly
    expect(results.Dijkstra.pathDistanceMeters).toBe(results['A*'].pathDistanceMeters);

    // A* should explore fewer or equal nodes than Dijkstra
    expect(results['A*'].nodesExpanded).toBeLessThanOrEqual(results.Dijkstra.nodesExpanded);

    // Every polyline coordinates array must be dense and valid
    for (const alg of Object.values(results)) {
      expect(alg.pathCoordinates.length).toBeGreaterThanOrEqual(alg.pathNodeIds.length);
      expect(alg.pathCoordinates[0]).toEqual([51.5033, -0.1517]); // Hyde Park
      expect(alg.pathCoordinates[alg.pathCoordinates.length - 1]).toEqual([51.5134, -0.089]); // Bank
      expect(alg.pathDistanceMeters).toBeGreaterThan(4000); // London route is ~4.5 km
    }
  });

  it('executes on Manhattan Grid (Battery Park to Columbus Circle)', () => {
    const results = runAllGraphAlgorithms(
      MANHATTAN_ROAD_GRAPH,
      'nyc-battery-park',
      'nyc-columbus-circle'
    );
    expect(results.Dijkstra.pathFound).toBe(true);
    expect(results['A*'].pathFound).toBe(true);
    expect(results.Dijkstra.pathDistanceMeters).toBe(results['A*'].pathDistanceMeters);
    expect(results.Dijkstra.pathDistanceMeters).toBeGreaterThan(7000);
  });

  it('executes on South Mumbai (Colaba to Chowpatty) and follows Marine Drive arc', () => {
    const results = runAllGraphAlgorithms(
      SOUTH_MUMBAI_ROAD_GRAPH,
      'mum-colaba-point',
      'mum-girgaon-chowpatty'
    );
    expect(results.Dijkstra.pathFound).toBe(true);
    expect(results['A*'].pathFound).toBe(true);
    expect(results.Dijkstra.pathDistanceMeters).toBe(results['A*'].pathDistanceMeters);

    // The route traverses Marine Drive waterfront arc and has dense curvature points
    const dijkstra = results.Dijkstra;
    expect(dijkstra.pathCoordinates.length).toBeGreaterThan(dijkstra.pathNodeIds.length);
  });

  it('executes on Mumbai D Ward (Gamdevi) to B Ward (Crawford Market) demonstrating algorithm divergence and road-following geometry', () => {
    const results = runAllGraphAlgorithms(
      SOUTH_MUMBAI_ROAD_GRAPH,
      'mum-gamdevi',
      'mum-crawford-market'
    );

    expect(results.Dijkstra.pathFound).toBe(true);
    expect(results['A*'].pathFound).toBe(true);
    expect(results.BFS.pathFound).toBe(true);
    expect(results.Greedy.pathFound).toBe(true);
    expect(results.DFS.pathFound).toBe(true);

    // Dijkstra and A* match the shortest distance
    expect(results.Dijkstra.pathDistanceMeters).toBe(results['A*'].pathDistanceMeters);

    // Every algorithm has dense coordinates tracking the actual street curves
    for (const alg of Object.values(results)) {
      expect(alg.pathCoordinates.length).toBeGreaterThan(alg.pathNodeIds.length);
      expect(alg.pathDistanceMeters).toBeGreaterThan(1500);
      expect(alg.pathDistanceMeters).toBeLessThan(10000);
    }
  });
});

describe('7. Overpass API Response Parsing & Validation', () => {
  it('parses raw Overpass JSON elements into a valid connected RoadGraph with dense geometry', () => {
    const rawData = {
      elements: [
        { type: 'node' as const, id: 101, lat: 18.925, lon: 72.825 },
        { type: 'node' as const, id: 102, lat: 18.93, lon: 72.83 },
        {
          type: 'way' as const,
          id: 501,
          nodes: [101, 102],
          tags: { highway: 'primary', name: 'MG Road' },
        },
      ],
    };

    const graph = parseOverpassRoadGraph(rawData);
    expect(graph.nodeCount).toBe(2);
    expect(graph.edgeCount).toBe(2); // Bidirectional
    expect(graph.adjacency.get('101')?.length).toBe(1);
    expect(graph.adjacency.get('102')?.length).toBe(1);

    const edge = graph.adjacency.get('101')![0];
    expect(edge.to).toBe('102');
    expect(edge.distanceMeters).toBeGreaterThan(0);
    expect(edge.geometry).toEqual([
      [18.925, 72.825],
      [18.93, 72.83],
    ]);
  });

  it('ignores non-drivable footways/cycleways during parsing', () => {
    const rawData = {
      elements: [
        { type: 'node' as const, id: 201, lat: 10.0, lon: 20.0 },
        { type: 'node' as const, id: 202, lat: 10.1, lon: 20.1 },
        {
          type: 'way' as const,
          id: 601,
          nodes: [201, 202],
          tags: { highway: 'footway' },
        },
      ],
    };
    const graph = parseOverpassRoadGraph(rawData);
    expect(graph.edgeCount).toBe(0);
  });

  it('rejects zero-length edges and self-loops', () => {
    const rawData = {
      elements: [
        { type: 'node' as const, id: 301, lat: 10.0, lon: 20.0 },
        {
          type: 'way' as const,
          id: 701,
          nodes: [301, 301], // Self-loop
          tags: { highway: 'residential' },
        },
      ],
    };
    const graph = parseOverpassRoadGraph(rawData);
    expect(graph.edgeCount).toBe(0);
  });
});
