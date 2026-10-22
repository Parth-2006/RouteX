/**
 * Live Overpass API Road Network Extraction Service
 * Queries OpenStreetMap Overpass servers for drivable road ways and intersections
 * within a bounded geographic area.
 */

import { RoadGraph } from './types';
import { parseOverpassRoadGraph, OverpassResponse } from './roadGraphParser';
import { haversineDistanceMeters } from './haversine';

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// In-memory cache for downloaded road graphs to prevent repeated network hits
const graphCache = new Map<string, RoadGraph>();

export interface FetchRoadGraphResult {
  graph: RoadGraph | null;
  error: string | null;
  fromCache?: boolean;
}

/**
 * Generates an Overpass QL query string for a bounding box.
 * Adapts highway filters based on span size for fast query turnaround.
 */
function buildOverpassQuery(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  spanKm: number,
  timeoutSeconds = 12
): string {
  // If span is large (> 4km), omit small residential service ways to keep payload fast and light
  const filter =
    spanKm > 4
      ? 'motorway|trunk|primary|secondary|tertiary|unclassified'
      : 'motorway|trunk|primary|secondary|tertiary|unclassified|residential';

  return `[out:json][timeout:${timeoutSeconds}];
way["highway"~"${filter}"](${minLat.toFixed(5)},${minLng.toFixed(5)},${maxLat.toFixed(5)},${maxLng.toFixed(5)});
(._; >;);
out body;`;
}

/**
 * Fetches real OpenStreetMap road network data from public Overpass servers
 * for the bounding box enclosing start and destination points.
 */
export async function fetchLiveRoadGraph(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  externalSignal?: AbortSignal
): Promise<FetchRoadGraphResult> {
  const directDistanceKm = haversineDistanceMeters(startLat, startLng, endLat, endLng) / 1000;

  // Enforce boundary limit: Overpass public servers reject massive queries
  if (directDistanceKm > 45) {
    return {
      graph: null,
      error: `Geographic distance (${directDistanceKm.toFixed(
        1
      )} km) exceeds the live Overpass extraction limit (max 45 km for full raw road graphs). Please select locations within a metropolitan/regional area, or explore our built-in urban road networks.`,
    };
  }

  // Calculate padded bounding box (~1.2 km margin)
  const padding = Math.max(0.012, Math.min(0.035, directDistanceKm * 0.002));
  const minLat = Math.min(startLat, endLat) - padding;
  const maxLat = Math.max(startLat, endLat) + padding;
  const minLng = Math.min(startLng, endLng) - padding;
  const maxLng = Math.max(startLng, endLng) + padding;

  const cacheKey = `${minLat.toFixed(3)},${minLng.toFixed(3)},${maxLat.toFixed(3)},${maxLng.toFixed(3)}`;
  if (graphCache.has(cacheKey)) {
    return {
      graph: graphCache.get(cacheKey)!,
      error: null,
      fromCache: true,
    };
  }

  const query = buildOverpassQuery(minLat, minLng, maxLat, maxLng, directDistanceKm, 10);
  let lastError = 'Public Overpass servers rate-limited or busy';

  for (const mirror of OVERPASS_MIRRORS) {
    if (externalSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Per-mirror 7-second timeout controller
    const mirrorAbortController = new AbortController();
    const timeoutId = setTimeout(() => mirrorAbortController.abort(), 7000);

    const onExternalAbort = () => mirrorAbortController.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const url = `${mirror}?data=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        signal: mirrorAbortController.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RouteX-Academic/2.0',
        },
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (!res.ok) {
        if (res.status === 429 || res.status === 504 || res.status === 502 || res.status === 406) {
          lastError = `Overpass server (${mirror}) returned HTTP ${res.status}`;
          continue;
        }
        lastError = `Overpass server error: HTTP ${res.status}`;
        continue;
      }

      const data: OverpassResponse = await res.json();
      if (!data || !Array.isArray(data.elements)) {
        lastError = 'Invalid payload received from Overpass server.';
        continue;
      }

      const graph = parseOverpassRoadGraph(data, `OSM Overpass Live (${directDistanceKm.toFixed(1)} km span)`);

      if (graph.nodeCount < 2 || graph.edgeCount < 1) {
        lastError = 'No drivable road segments found in this area (may be over water or parkland).';
        continue;
      }

      // Cache successful graph
      graphCache.set(cacheKey, graph);
      return {
        graph,
        error: null,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (externalSignal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      lastError = err instanceof Error ? err.message : 'Network error communicating with Overpass';
    }
  }

  return {
    graph: null,
    error: `Could not download live road graph from public Overpass servers: ${lastError}.`,
  };
}
