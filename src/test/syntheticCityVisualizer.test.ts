import { describe, it, expect } from 'vitest';
import {
  generateSyntheticCity,
  DEFAULT_SYNTHETIC_CITY,
} from '../algorithms/graph/syntheticCityGenerator';
import {
  runGraphBFS,
  runGraphDFS,
  runGraphDijkstra,
  runGraphAStar,
  runAllGraphAlgorithms,
} from '../algorithms/graph/searchAlgorithms';
import { buildGraphSearchTrace } from '../algorithms/graph/searchTracer';
import { RoadGraph, RoadNode } from '../algorithms/graph/types';


describe('1. Synthetic City Road Network Generation & Determinism', () => {
  it('generates reproducible identical networks given the same seed', () => {
    const city1 = generateSyntheticCity(42);
    const city2 = generateSyntheticCity(42);

    expect(city1.graph.nodeCount).toBe(city2.graph.nodeCount);
    expect(city1.graph.edgeCount).toBe(city2.graph.edgeCount);
    expect(city1.intersections.length).toBe(city2.intersections.length);
    expect(city1.roads.length).toBe(city2.roads.length);

    // Verify first and last node IDs match
    expect(city1.intersections[0].id).toBe(city2.intersections[0].id);
    expect(city1.intersections[city1.intersections.length - 1].id).toBe(
      city2.intersections[city2.intersections.length - 1].id
    );
  });

  it('generates distinct seeds with valid graph structure', () => {
    const cityA = generateSyntheticCity(101);
    const cityB = generateSyntheticCity(202);

    expect(cityA.seed).toBe(101);
    expect(cityB.seed).toBe(202);
    expect(cityA.graph.nodeCount).toBeGreaterThan(25);
    expect(cityB.graph.nodeCount).toBeGreaterThan(25);
  });

  it('guarantees unique intersection IDs and strictly positive edge costs', () => {
    const city = DEFAULT_SYNTHETIC_CITY;
    const seenIds = new Set<string>();

    for (const node of city.intersections) {
      expect(seenIds.has(node.id)).toBe(false);
      seenIds.add(node.id);
      expect(city.graph.nodes.has(node.id)).toBe(true);
    }

    // Edge cost positivity and geometry preservation
    for (const [fromId, edges] of city.graph.adjacency.entries()) {
      expect(city.graph.nodes.has(fromId)).toBe(true);
      for (const edge of edges) {
        expect(edge.distanceMeters).toBeGreaterThan(0.01);
        expect(edge.geometry.length).toBeGreaterThanOrEqual(2);
        expect(city.graph.nodes.has(edge.to)).toBe(true);
      }
    }
  });

  it('includes key urban features: river bridges and dead ends', () => {
    const city = DEFAULT_SYNTHETIC_CITY;
    const bridgeEdges = city.roads.filter((r) => r.type === 'bridge');
    expect(bridgeEdges.length).toBeGreaterThanOrEqual(3);

    const deadEnds = city.intersections.filter((n) => n.isDeadEnd);
    expect(deadEnds.length).toBeGreaterThanOrEqual(3);

    expect(city.waterCorridors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('2. User-Controlled Dynamic Start & Destination Selection', () => {
  const city = DEFAULT_SYNTHETIC_CITY;

  it('recalculates routes when start node changes with fixed destination', () => {
    const dest = 'e-central-tower';
    const start1 = 'w-civic-center';
    const start2 = 'w-nw-crest';

    const res1 = runGraphDijkstra(city.graph, start1, dest);
    const res2 = runGraphDijkstra(city.graph, start2, dest);

    expect(res1.pathFound).toBe(true);
    expect(res2.pathFound).toBe(true);
    expect(res1.pathNodeIds[0]).toBe(start1);
    expect(res2.pathNodeIds[0]).toBe(start2);
    // Northwest crest is geographically further from downtown than civic center
    expect(res2.pathDistanceMeters).not.toBe(res1.pathDistanceMeters);
  });

  it('recalculates routes when destination changes with fixed start', () => {
    const start = 'w-civic-center';
    const dest1 = 'e-central-tower';
    const dest2 = 'e-southeast-depot';

    const res1 = runGraphDijkstra(city.graph, start, dest1);
    const res2 = runGraphDijkstra(city.graph, start, dest2);

    expect(res1.pathFound).toBe(true);
    expect(res2.pathFound).toBe(true);
    expect(res1.pathNodeIds[res1.pathNodeIds.length - 1]).toBe(dest1);
    expect(res2.pathNodeIds[res2.pathNodeIds.length - 1]).toBe(dest2);
    expect(res1.pathDistanceMeters).not.toBe(res2.pathDistanceMeters);
  });

  it('swaps start and destination nodes cleanly', () => {
    const start = 'w-civic-center';
    const dest = 'e-central-tower';

    const forward = runGraphDijkstra(city.graph, start, dest);
    const reverse = runGraphDijkstra(city.graph, dest, start);

    expect(forward.pathFound).toBe(true);
    expect(reverse.pathFound).toBe(true);
    expect(forward.pathNodeIds[0]).toBe(start);
    expect(forward.pathNodeIds[forward.pathNodeIds.length - 1]).toBe(dest);
    expect(reverse.pathNodeIds[0]).toBe(dest);
    expect(reverse.pathNodeIds[reverse.pathNodeIds.length - 1]).toBe(start);
  });

  it('handles identical start and destination gracefully (zero distance & hops)', () => {
    const node = 'w-civic-center';
    const res = runGraphDijkstra(city.graph, node, node);

    expect(res.pathFound).toBe(true);
    expect(res.pathDistanceMeters).toBe(0);
    expect(res.edgeCount).toBe(0);
    expect(res.pathNodeIds).toEqual([node]);
  });

  it('handles unreachable destination without crashing or inventing paths', () => {
    // Construct an isolated graph copy
    const isolatedNodes = new Map<string, RoadNode>(city.graph.nodes);
    isolatedNodes.set('ISLAND_ISOLATED', {
      id: 'ISLAND_ISOLATED',
      lat: 37.8,
      lng: -122.4,
      name: 'Unconnected Sanctuary',
    });

    const isolatedGraph: RoadGraph = {
      ...city.graph,
      nodes: isolatedNodes,
    };

    const res = runGraphDijkstra(isolatedGraph, 'w-civic-center', 'ISLAND_ISOLATED');
    expect(res.pathFound).toBe(false);
    expect(res.pathDistanceMeters).toBe(0);
    expect(res.pathNodeIds).toEqual([]);
  });
});

describe('3. Algorithm Comparison on Identical Synthetic Graph Snapshot', () => {
  const city = DEFAULT_SYNTHETIC_CITY;
  const startId = 'w-civic-center';
  const destId = 'e-central-tower';

  it('runs all five algorithms on identical topology and endpoints', () => {
    const results = runAllGraphAlgorithms(city.graph, startId, destId);

    expect(results.Dijkstra.pathFound).toBe(true);
    expect(results['A*'].pathFound).toBe(true);
    expect(results.BFS.pathFound).toBe(true);
    expect(results.Greedy.pathFound).toBe(true);
    expect(results.DFS.pathFound).toBe(true);
  });

  it('proves A* and Dijkstra find the exact same optimal distance', () => {
    const dijkstraRes = runGraphDijkstra(city.graph, startId, destId);
    const astarRes = runGraphAStar(city.graph, startId, destId);

    expect(astarRes.pathDistanceMeters).toBe(dijkstraRes.pathDistanceMeters);
    // A* should expand fewer or equal nodes compared to unguided Dijkstra
    expect(astarRes.nodesExpanded).toBeLessThanOrEqual(dijkstraRes.nodesExpanded);
  });

  it('verifies that BFS optimizes edge count (hops)', () => {
    const bfsRes = runGraphBFS(city.graph, startId, destId);
    const dfsRes = runGraphDFS(city.graph, startId, destId);

    expect(bfsRes.pathFound).toBe(true);
    expect(bfsRes.edgeCount).toBeLessThanOrEqual(dfsRes.edgeCount);
  });

  it('verifies final paths follow continuous connected road edges', () => {
    const results = runAllGraphAlgorithms(city.graph, startId, destId);

    for (const [algoName, res] of Object.entries(results)) {
      expect(res.pathFound).toBe(true);
      expect(res.pathNodeIds[0]).toBe(startId);
      expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe(destId);

      // Verify every step u -> v is an actual edge in the graph
      for (let i = 0; i < res.pathNodeIds.length - 1; i++) {
        const u = res.pathNodeIds[i];
        const v = res.pathNodeIds[i + 1];
        const edges = city.graph.adjacency.get(u) || [];
        const edgeExists = edges.some((e) => e.to === v);
        expect(edgeExists, `Edge ${u} -> ${v} must exist in graph for ${algoName}`).toBe(true);
      }
    }
  });
});

describe('4. Search Tracer Step-by-Step State Capture', () => {
  const city = DEFAULT_SYNTHETIC_CITY;
  const startId = 'w-civic-center';
  const destId = 'e-central-tower';

  it('builds step-by-step trace frames for Dijkstra', () => {
    const trace = buildGraphSearchTrace('Dijkstra', city.graph, startId, destId);

    expect(trace.totalSteps).toBeGreaterThan(1);
    expect(trace.frames.length).toBe(trace.totalSteps);

    // Initial frame
    expect(trace.frames[0].frameIndex).toBe(0);
    expect(trace.frames[0].isComplete).toBe(false);

    // Final frame
    const lastFrame = trace.frames[trace.frames.length - 1];
    expect(lastFrame.isComplete).toBe(true);
    expect(lastFrame.finalPathNodeIds.length).toBeGreaterThan(0);
    expect(lastFrame.finalPathNodeIds[0]).toBe(startId);
    expect(lastFrame.finalPathNodeIds[lastFrame.finalPathNodeIds.length - 1]).toBe(destId);
  });

  it('builds step-by-step trace frames for A*, BFS, Greedy, and DFS', () => {
    const algos = ['A*', 'BFS', 'Greedy', 'DFS'] as const;

    for (const algo of algos) {
      const trace = buildGraphSearchTrace(algo, city.graph, startId, destId);
      expect(trace.totalSteps).toBeGreaterThan(1);
      const lastFrame = trace.frames[trace.frames.length - 1];
      expect(lastFrame.isComplete).toBe(true);
      expect(lastFrame.finalPathNodeIds[0]).toBe(startId);
      expect(lastFrame.finalPathNodeIds[lastFrame.finalPathNodeIds.length - 1]).toBe(destId);
    }
  });
});
