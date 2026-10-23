/**
 * Synthetic City Road Network Generator
 * Produces deterministic, realistic-looking city road networks completely offline.
 * Expanded to 100+ intersections covering the entire screen:
 * - North Highlands, Alpine Ridge, Summit Overlook
 * - Downtown Financial Core & Metropolis Tower Plaza
 * - Arts Quarter, Historic Old Town, and Maritime Marina
 * - South Industrial Rail Depot, Airport Complex, and Deepwater Port
 * - 6 major bridges across the river channel
 * - Multiple arterial freeways, avenues, alleys, and dead ends
 */

import { RoadGraph, RoadNode, RoadEdge } from './types';
import { haversineDistanceMeters } from './haversine';

export type RoadType = 'motorway' | 'primary' | 'secondary' | 'residential' | 'bridge' | 'alley';

export interface CityIntersection extends RoadNode {
  name: string;
  district: string;
  isDeadEnd?: boolean;
  isWaterfront?: boolean;
}

export interface CityRoadSegment {
  id: string;
  from: string;
  to: string;
  name: string;
  type: RoadType;
  oneWay: boolean;
  distanceMeters: number;
  geometry: [number, number][]; // Dense [lat, lng]
}

export interface CityWaterCorridor {
  name: string;
  path: [number, number][]; // [lat, lng] polyline points
  widthMeters: number;
}

export interface CityPark {
  id: string;
  name: string;
  polygon: [number, number][]; // [lat, lng] polygon vertices
}

export interface CityScenario {
  id: string;
  name: string;
  description: string;
  startNodeId: string;
  destNodeId: string;
  highlightBridge?: boolean;
}

export interface SyntheticCity {
  seed: number;
  name: string;
  graph: RoadGraph;
  intersections: CityIntersection[];
  roads: CityRoadSegment[];
  waterCorridors: CityWaterCorridor[];
  parks: CityPark[];
  scenarios: CityScenario[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

/**
 * Generates intermediate curved points between two coordinates using quadratic Bezier curve.
 */
function generateCurvedPoints(
  p1: [number, number],
  p2: [number, number],
  curvature: number,
  numPoints = 5
): [number, number][] {
  if (Math.abs(curvature) < 0.001) {
    return [p1, p2];
  }

  const midLat = (p1[0] + p2[0]) / 2;
  const midLng = (p1[1] + p2[1]) / 2;

  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  const ctrlLat = midLat - dLng * curvature;
  const ctrlLng = midLng + dLat * curvature;

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lat = invT * invT * p1[0] + 2 * invT * t * ctrlLat + t * t * p2[0];
    const lng = invT * invT * p1[1] + 2 * invT * t * ctrlLng + t * t * p2[1];
    points.push([lat, lng]);
  }
  return points;
}

/**
 * Computes exact cumulative geodesic distance along an array of coordinates in meters.
 */
function computeGeometryDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineDistanceMeters(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return Math.max(1.0, total);
}

/**
 * Procedural City Builder with 100+ dense nodes spanning the full canvas
 */
export function generateSyntheticCity(seedValue: number | string = 42): SyntheticCity {
  const numericSeed =
    typeof seedValue === 'number'
      ? seedValue
      : Array.from(seedValue).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 42;

  // Center coordinate around micro-grid: Lat ~37.775, Lng ~ -122.42
  const centerLat = 37.775;
  const centerLng = -122.42;

  // Expanded Grid Extents: ~8 km latitude by ~10 km longitude to fill wide screens
  const latSpan = 0.070; // ~7.8 km
  const lngSpan = 0.096; // ~8.5 km

  const minLat = centerLat - latSpan / 2;
  const maxLat = centerLat + latSpan / 2;
  const minLng = centerLng - lngSpan / 2;
  const maxLng = centerLng + lngSpan / 2;

  // 1. Water Corridor: Natural river traversing entire canvas from far north to far south
  const riverPoints: [number, number][] = [
    [maxLat + 0.006, centerLng - 0.010],
    [centerLat + 0.026, centerLng - 0.007],
    [centerLat + 0.015, centerLng - 0.004],
    [centerLat + 0.005, centerLng + 0.002],
    [centerLat - 0.005, centerLng + 0.004],
    [centerLat - 0.015, centerLng - 0.003],
    [centerLat - 0.026, centerLng - 0.005],
    [minLat - 0.006, centerLng - 0.008],
  ];

  const river: CityWaterCorridor = {
    name: 'Metropolis River Channel',
    path: riverPoints,
    widthMeters: 320,
  };

  // 2. Parks & Plazas
  const parks: CityPark[] = [
    {
      id: 'park-central',
      name: 'Emerald City Park',
      polygon: [
        [centerLat + 0.008, centerLng - 0.020],
        [centerLat + 0.008, centerLng - 0.011],
        [centerLat + 0.001, centerLng - 0.011],
        [centerLat + 0.001, centerLng - 0.020],
      ],
    },
    {
      id: 'park-east-marina',
      name: 'East Marina Waterfront Park',
      polygon: [
        [centerLat - 0.002, centerLng + 0.017],
        [centerLat - 0.002, centerLng + 0.026],
        [centerLat - 0.011, centerLng + 0.026],
        [centerLat - 0.011, centerLng + 0.017],
      ],
    },
    {
      id: 'park-north-reservoir',
      name: 'Highland Alpine Reservoir',
      polygon: [
        [centerLat + 0.032, centerLng - 0.024],
        [centerLat + 0.032, centerLng - 0.014],
        [centerLat + 0.025, centerLng - 0.014],
        [centerLat + 0.025, centerLng - 0.024],
      ],
    },
    {
      id: 'park-south-estuary',
      name: 'South Estuary Wildlife Sanctuary',
      polygon: [
        [centerLat - 0.023, centerLng - 0.032],
        [centerLat - 0.023, centerLng - 0.022],
        [centerLat - 0.032, centerLng - 0.022],
        [centerLat - 0.032, centerLng - 0.032],
      ],
    },
  ];

  // 3. Define Master Intersections (100+ dense nodes)
  const intersectionList: CityIntersection[] = [];

  // --- SECTOR 1: FAR NORTH HIGHLANDS (WEST & EAST) ---
  intersectionList.push(
    // Far North West
    { id: 'w-observatory-peak', lat: centerLat + 0.031, lng: centerLng - 0.040, name: 'Observatory Peak', district: 'Alpine Overlook' },
    { id: 'w-alpine-crest', lat: centerLat + 0.031, lng: centerLng - 0.028, name: 'Alpine Ridge Summit', district: 'Alpine Overlook' },
    { id: 'w-highland-terrace', lat: centerLat + 0.031, lng: centerLng - 0.018, name: 'Highland Park Terrace', district: 'Alpine Overlook' },
    { id: 'w-reservoir-gate', lat: centerLat + 0.030, lng: centerLng - 0.010, name: 'Reservoir Gate North', district: 'Alpine Overlook' },
    { id: 'w-gorge-bridge-west', lat: centerLat + 0.028, lng: centerLng - 0.006, name: 'High Gorge Bridge West', district: 'River Crossing', isWaterfront: true },
    { id: 'w-canyon-deadend', lat: centerLat + 0.034, lng: centerLng - 0.033, name: 'Eagle Canyon Lookout', district: 'Alpine Overlook', isDeadEnd: true },

    // Far North East
    { id: 'e-gorge-bridge-east', lat: centerLat + 0.028, lng: centerLng - 0.001, name: 'High Gorge Bridge East', district: 'River Crossing', isWaterfront: true },
    { id: 'e-summit-ridge', lat: centerLat + 0.030, lng: centerLng + 0.010, name: 'Summit Vista Ridge', district: 'Northern Heights' },
    { id: 'e-highview-plaza', lat: centerLat + 0.031, lng: centerLng + 0.020, name: 'Highview Observatory', district: 'Northern Heights' },
    { id: 'e-radio-tower-hill', lat: centerLat + 0.031, lng: centerLng + 0.031, name: 'Radio Tower Overlook', district: 'Northern Heights' },
    { id: 'e-timber-gate', lat: centerLat + 0.030, lng: centerLng + 0.042, name: 'North Forest Gate', district: 'Northern Heights' },
    { id: 'e-lookout-deadend', lat: centerLat + 0.034, lng: centerLng + 0.026, name: 'North Summit Peak', district: 'Northern Heights', isDeadEnd: true }
  );

  // --- SECTOR 2: UPPER WEST & CAMPUS DISTRICT ---
  intersectionList.push(
    { id: 'w-timberline-junction', lat: centerLat + 0.020, lng: centerLng - 0.040, name: 'Timberline Parkway', district: 'West Hills' },
    { id: 'w-nw-crest', lat: centerLat + 0.020, lng: centerLng - 0.028, name: 'Northwest Crest', district: 'West Heights' },
    { id: 'w-crest-blvd', lat: centerLat + 0.020, lng: centerLng - 0.019, name: 'Crest Boulevard', district: 'West Heights' },
    { id: 'w-north-plaza', lat: centerLat + 0.019, lng: centerLng - 0.012, name: 'North Park Plaza', district: 'West Heights' },
    { id: 'w-north-waterfront', lat: centerLat + 0.018, lng: centerLng - 0.006, name: 'North Riverwalk West', district: 'West Waterfront', isWaterfront: true },

    { id: 'w-campus-north-gate', lat: centerLat + 0.013, lng: centerLng - 0.039, name: 'Campus North Perimeter', district: 'Campus District' },
    { id: 'w-univ-gate', lat: centerLat + 0.011, lng: centerLng - 0.028, name: 'University West Gate', district: 'Campus District' },
    { id: 'w-univ-quad', lat: centerLat + 0.011, lng: centerLng - 0.020, name: 'Campus Quadrangle', district: 'Campus District' },
    { id: 'w-library-sq', lat: centerLat + 0.011, lng: centerLng - 0.013, name: 'City Library Square', district: 'Civic Center' },
    { id: 'w-bridge-north-approach', lat: centerLat + 0.012, lng: centerLng - 0.005, name: 'Grand Arch Bridge West', district: 'River Crossing', isWaterfront: true },
    { id: 'w-culdesac-north', lat: centerLat + 0.023, lng: centerLng - 0.015, name: 'Pine Crest Cul-de-sac', district: 'West Heights', isDeadEnd: true }
  );

  // --- SECTOR 3: UPPER EAST & SILICON TECH DISTRICT ---
  intersectionList.push(
    { id: 'e-north-waterfront', lat: centerLat + 0.017, lng: centerLng + 0.000, name: 'North Riverwalk East', district: 'East Waterfront', isWaterfront: true },
    { id: 'e-bridge-north-approach', lat: centerLat + 0.012, lng: centerLng + 0.000, name: 'Grand Arch Bridge East', district: 'River Crossing', isWaterfront: true },
    { id: 'e-grand-circus', lat: centerLat + 0.020, lng: centerLng + 0.009, name: 'Grand Circus Roundabout', district: 'Metro Uptown' },
    { id: 'e-tech-hub', lat: centerLat + 0.012, lng: centerLng + 0.009, name: 'Silicon District Hub', district: 'Tech Corridor' },
    { id: 'e-uptown-blvd', lat: centerLat + 0.020, lng: centerLng + 0.018, name: 'Uptown Boulevard', district: 'Metro Uptown' },
    { id: 'e-innovation-way', lat: centerLat + 0.011, lng: centerLng + 0.018, name: 'Innovation Way & 7th', district: 'Tech Corridor' },
    { id: 'e-northeast-hills', lat: centerLat + 0.020, lng: centerLng + 0.029, name: 'Northeast Hillcrest', district: 'Uptown Ridge' },
    { id: 'e-eastgate-transit', lat: centerLat + 0.011, lng: centerLng + 0.029, name: 'Eastgate Transit Center', district: 'East Suburbs' },
    { id: 'e-silicon-parkway', lat: centerLat + 0.020, lng: centerLng + 0.040, name: 'Silicon Outer Parkway', district: 'Tech Corridor' },
    { id: 'e-aerotech-center', lat: centerLat + 0.011, lng: centerLng + 0.040, name: 'Aerotech Research Center', district: 'Tech Corridor' },
    { id: 'e-culdesac-east', lat: centerLat + 0.017, lng: centerLng + 0.044, name: 'Summit Vista Cul-de-sac', district: 'Uptown Ridge', isDeadEnd: true }
  );

  // --- SECTOR 4: DOWNTOWN WEST & FINANCIAL CORE ---
  intersectionList.push(
    { id: 'w-sunset-junction', lat: centerLat + 0.003, lng: centerLng - 0.039, name: 'Sunset Boulevard & 9th', district: 'West Metro' },
    { id: 'w-civic-center', lat: centerLat + 0.003, lng: centerLng - 0.028, name: 'Civic Center Station', district: 'Downtown West' },
    { id: 'w-broadway-west', lat: centerLat + 0.003, lng: centerLng - 0.019, name: 'Broadway & 4th Ave', district: 'Downtown West' },
    { id: 'w-financial-sq', lat: centerLat + 0.003, lng: centerLng - 0.011, name: 'Commerce Square', district: 'Financial Core' },
    { id: 'w-mid-bridge-approach', lat: centerLat + 0.004, lng: centerLng - 0.002, name: 'Suspension Bridge West', district: 'River Crossing', isWaterfront: true },
    { id: 'w-chamber-of-commerce', lat: centerLat + 0.007, lng: centerLng - 0.017, name: 'Chamber of Commerce', district: 'Financial Core' },
    { id: 'w-central-post', lat: centerLat + 0.007, lng: centerLng - 0.026, name: 'Central Post Square', district: 'Civic Center' },
    { id: 'w-dock-pier-3', lat: centerLat - 0.000, lng: centerLng - 0.003, name: 'Historic Pier 3', district: 'West Waterfront', isDeadEnd: true, isWaterfront: true }
  );

  // --- SECTOR 5: DOWNTOWN EAST & METROPOLIS TOWER CORE ---
  intersectionList.push(
    { id: 'e-mid-bridge-approach', lat: centerLat + 0.004, lng: centerLng + 0.005, name: 'Suspension Bridge East', district: 'River Crossing', isWaterfront: true },
    { id: 'e-central-tower', lat: centerLat + 0.004, lng: centerLng + 0.013, name: 'Metropolis Tower Plaza', district: 'Downtown East' },
    { id: 'e-metro-center', lat: centerLat + 0.003, lng: centerLng + 0.021, name: 'Metro Center Plaza', district: 'Downtown East' },
    { id: 'e-east-terminal', lat: centerLat + 0.004, lng: centerLng + 0.030, name: 'East Motorway Gateway', district: 'East Gateway' },
    { id: 'e-financial-avenue', lat: centerLat + 0.007, lng: centerLng + 0.015, name: 'Wall Street of the West', district: 'Downtown East' },
    { id: 'e-stock-exchange', lat: centerLat + 0.007, lng: centerLng + 0.023, name: 'Pacific Stock Exchange', district: 'Downtown East' },
    { id: 'e-airport-gateway', lat: centerLat + 0.004, lng: centerLng + 0.040, name: 'Metropolis Airport Parkway', district: 'Airport Zone' },
    { id: 'e-airport-terminal-1', lat: centerLat + 0.005, lng: centerLng + 0.046, name: 'Airport International Terminal', district: 'Airport Zone' },
    { id: 'e-pier-9-terminal', lat: centerLat + 0.008, lng: centerLng + 0.002, name: 'Ferry Pier 9', district: 'East Waterfront', isDeadEnd: true, isWaterfront: true }
  );

  // --- SECTOR 6: ARTS DISTRICT & HISTORIC OLD TOWN (LOWER MID WEST) ---
  intersectionList.push(
    { id: 'w-west-valley-ave', lat: centerLat - 0.006, lng: centerLng - 0.038, name: 'West Valley Avenue', district: 'Arts District' },
    { id: 'w-arts-quarter', lat: centerLat - 0.006, lng: centerLng - 0.027, name: 'Arts Quarter Junction', district: 'Arts District' },
    { id: 'w-theatre-row', lat: centerLat - 0.006, lng: centerLng - 0.018, name: 'Theatre Row & Grand Ave', district: 'Arts District' },
    { id: 'w-old-market', lat: centerLat - 0.006, lng: centerLng - 0.010, name: 'Old Town Market', district: 'Historic District' },
    { id: 'w-south-bridge-approach', lat: centerLat - 0.005, lng: centerLng + 0.001, name: 'Old Stone Bridge West', district: 'River Crossing', isWaterfront: true },
    { id: 'w-artisan-village', lat: centerLat - 0.010, lng: centerLng - 0.020, name: 'Artisan Village Mews', district: 'Arts District' },
    { id: 'w-historic-clocktower', lat: centerLat - 0.010, lng: centerLng - 0.011, name: 'Historic Clocktower Square', district: 'Historic District' },
    { id: 'w-alley-deadend', lat: centerLat - 0.010, lng: centerLng - 0.028, name: 'Sculptor Alley Dead-End', district: 'Arts District', isDeadEnd: true }
  );

  // --- SECTOR 7: MARINA DISTRICT & HARBOR ESPLANADE (LOWER MID EAST) ---
  intersectionList.push(
    { id: 'e-south-bridge-approach', lat: centerLat - 0.005, lng: centerLng + 0.006, name: 'Old Stone Bridge East', district: 'River Crossing', isWaterfront: true },
    { id: 'e-harbor-blvd', lat: centerLat - 0.006, lng: centerLng + 0.014, name: 'Harbor Boulevard', district: 'Marina District' },
    { id: 'e-marina-center', lat: centerLat - 0.006, lng: centerLng + 0.022, name: 'Yacht Club Esplanade', district: 'Marina District' },
    { id: 'e-coastal-express', lat: centerLat - 0.005, lng: centerLng + 0.031, name: 'Coastal Expressway Junction', district: 'Coast Corridor' },
    { id: 'e-yacht-haven', lat: centerLat - 0.010, lng: centerLng + 0.015, name: 'Yacht Basin Slipway', district: 'Marina District' },
    { id: 'e-regatta-wharf', lat: centerLat - 0.010, lng: centerLng + 0.023, name: 'Regatta Plaza', district: 'Marina District' },
    { id: 'e-coastal-gateway', lat: centerLat - 0.006, lng: centerLng + 0.040, name: 'Ocean Drive Parkway', district: 'Coast Corridor' },
    { id: 'e-harbor-lighthouse', lat: centerLat - 0.011, lng: centerLng + 0.032, name: 'Harbor Lighthouse Point', district: 'Marina District', isDeadEnd: true }
  );

  // --- SECTOR 8: SOUTH SUBURBS & FREIGHT RAIL DEPOT (SOUTH WEST) ---
  intersectionList.push(
    { id: 'w-horizon-crossing', lat: centerLat - 0.016, lng: centerLng - 0.037, name: 'South Horizon Crossing', district: 'South Suburbs' },
    { id: 'w-south-terminal', lat: centerLat - 0.016, lng: centerLng - 0.027, name: 'South Transit Terminal', district: 'South Suburbs' },
    { id: 'w-industrial-park', lat: centerLat - 0.016, lng: centerLng - 0.018, name: 'West Industrial Park', district: 'South Suburbs' },
    { id: 'w-railyard-junction', lat: centerLat - 0.015, lng: centerLng - 0.011, name: 'Freight Depot Junction', district: 'Freight Zone' },
    { id: 'w-south-pier-approach', lat: centerLat - 0.014, lng: centerLng - 0.004, name: 'South Promenade West', district: 'River Crossing', isWaterfront: true },
    { id: 'w-freight-spur', lat: centerLat - 0.021, lng: centerLng - 0.024, name: 'Intermodal Freight Spur', district: 'Freight Zone' },
    { id: 'w-rail-depot-central', lat: centerLat - 0.021, lng: centerLng - 0.013, name: 'Locomotive Maintenance Hub', district: 'Freight Zone' }
  );

  // --- SECTOR 9: PORT LOGISTICS & SOUTHEAST TERMINAL (SOUTH EAST) ---
  intersectionList.push(
    { id: 'e-south-waterfront', lat: centerLat - 0.014, lng: centerLng + 0.001, name: 'South Riverwalk East', district: 'South Harbor', isWaterfront: true },
    { id: 'e-cargo-wharf', lat: centerLat - 0.015, lng: centerLng + 0.011, name: 'Cargo Wharf Gateway', district: 'Port Terminal' },
    { id: 'e-port-logistics', lat: centerLat - 0.016, lng: centerLng + 0.019, name: 'Port Logistics Hub', district: 'Port Terminal' },
    { id: 'e-southeast-depot', lat: centerLat - 0.016, lng: centerLng + 0.029, name: 'Southeast Rail Depot', district: 'Port Terminal' },
    { id: 'e-container-yard', lat: centerLat - 0.021, lng: centerLng + 0.013, name: 'Container Terminal East', district: 'Port Terminal' },
    { id: 'e-customs-wharf', lat: centerLat - 0.021, lng: centerLng + 0.023, name: 'Customs Inspection Wharf', district: 'Port Terminal' },
    { id: 'e-logistics-corridor', lat: centerLat - 0.016, lng: centerLng + 0.039, name: 'Logistics Outer Parkway', district: 'Port Terminal' }
  );

  // --- SECTOR 10: FAR SOUTH OCEANFRONT & DEEPWATER BASIN (FAR SOUTH) ---
  intersectionList.push(
    { id: 'w-bayfront-southwest', lat: centerLat - 0.028, lng: centerLng - 0.036, name: 'South Bayfront Promenade', district: 'Oceanfront' },
    { id: 'w-refinery-gate', lat: centerLat - 0.028, lng: centerLng - 0.026, name: 'Refinery South Gate', district: 'Oceanfront' },
    { id: 'w-container-wharf-south', lat: centerLat - 0.028, lng: centerLng - 0.014, name: 'Deepwater Container Berth West', district: 'Deepwater Basin' },
    { id: 'w-ocean-bridge-west', lat: centerLat - 0.026, lng: centerLng - 0.006, name: 'South Bay Viaduct West', district: 'River Crossing', isWaterfront: true },

    { id: 'e-ocean-bridge-east', lat: centerLat - 0.026, lng: centerLng + 0.001, name: 'South Bay Viaduct East', district: 'River Crossing', isWaterfront: true },
    { id: 'e-deepwater-berth', lat: centerLat - 0.028, lng: centerLng + 0.012, name: 'Deepwater Berth East', district: 'Deepwater Basin' },
    { id: 'e-south-terminal-port', lat: centerLat - 0.028, lng: centerLng + 0.025, name: 'Ocean Passenger Terminal', district: 'Deepwater Basin' },
    { id: 'e-coastal-causeway-south', lat: centerLat - 0.028, lng: centerLng + 0.038, name: 'South Coastal Causeway', district: 'Oceanfront' },
    { id: 'w-salt-marsh-pier', lat: centerLat - 0.033, lng: centerLng - 0.021, name: 'Salt Marsh Pier', district: 'Oceanfront', isDeadEnd: true },
    { id: 'e-ocean-jetty', lat: centerLat - 0.033, lng: centerLng + 0.020, name: 'Breakwater Ocean Jetty', district: 'Oceanfront', isDeadEnd: true }
  );

  // --- SECTOR 11: RIVER ISLANDS ---
  intersectionList.push(
    { id: 'island-north', lat: centerLat - 0.001, lng: centerLng + 0.001, name: 'River Island North', district: 'River Island' },
    { id: 'island-south', lat: centerLat - 0.004, lng: centerLng + 0.003, name: 'River Island Sanctuary', district: 'River Island' }
  );

  const nodeMap = new Map<string, CityIntersection>();
  for (const n of intersectionList) {
    nodeMap.set(n.id, n);
  }

  // 4. Build Dense Connected Road Network
  interface RawEdge {
    from: string;
    to: string;
    name: string;
    type: RoadType;
    oneWay?: boolean;
    curvature?: number;
    customGeom?: [number, number][];
  }

  const rawEdges: RawEdge[] = [];

  // Far North Sector West
  rawEdges.push(
    { from: 'w-observatory-peak', to: 'w-alpine-crest', name: 'Observatory Ridge Way', type: 'motorway', curvature: 0.06 },
    { from: 'w-alpine-crest', to: 'w-highland-terrace', name: 'Alpine Highway', type: 'primary' },
    { from: 'w-highland-terrace', to: 'w-reservoir-gate', name: 'Alpine Highway', type: 'primary' },
    { from: 'w-reservoir-gate', to: 'w-gorge-bridge-west', name: 'Gorge Bridge Approach', type: 'primary', curvature: -0.04 },
    { from: 'w-alpine-crest', to: 'w-canyon-deadend', name: 'Eagle Canyon Access', type: 'alley' }
  );

  // Far North Sector East
  rawEdges.push(
    { from: 'e-gorge-bridge-east', to: 'e-summit-ridge', name: 'High Gorge Parkway', type: 'primary', curvature: 0.04 },
    { from: 'e-summit-ridge', to: 'e-highview-plaza', name: 'Highview Ridge Drive', type: 'primary' },
    { from: 'e-highview-plaza', to: 'e-radio-tower-hill', name: 'Highview Ridge Drive', type: 'secondary' },
    { from: 'e-radio-tower-hill', to: 'e-timber-gate', name: 'Skyline Perimeter Loop', type: 'motorway', curvature: 0.07 },
    { from: 'e-highview-plaza', to: 'e-lookout-deadend', name: 'North Summit Vista', type: 'alley' }
  );

  // North-to-Mid Vertical Highway Links (North West to Upper West)
  rawEdges.push(
    { from: 'w-observatory-peak', to: 'w-timberline-junction', name: 'West Ridge Highway', type: 'motorway' },
    { from: 'w-alpine-crest', to: 'w-nw-crest', name: 'Crestline Way', type: 'primary' },
    { from: 'w-highland-terrace', to: 'w-crest-blvd', name: 'Terrace Connector', type: 'secondary' },
    { from: 'w-reservoir-gate', to: 'w-north-plaza', name: 'Reservoir Road', type: 'secondary' },
    { from: 'w-gorge-bridge-west', to: 'w-north-waterfront', name: 'North Promenade High Route', type: 'primary', curvature: -0.05 }
  );

  // North-to-Mid Vertical Highway Links (North East to Upper East)
  rawEdges.push(
    { from: 'e-gorge-bridge-east', to: 'e-north-waterfront', name: 'High East Esplanade', type: 'primary', curvature: 0.05 },
    { from: 'e-summit-ridge', to: 'e-grand-circus', name: 'Summit Parkway', type: 'primary' },
    { from: 'e-highview-plaza', to: 'e-uptown-blvd', name: 'Highland Avenue', type: 'secondary' },
    { from: 'e-radio-tower-hill', to: 'e-northeast-hills', name: 'Radio Hill Expressway', type: 'secondary' },
    { from: 'e-timber-gate', to: 'e-silicon-parkway', name: 'Outer Perimeter East', type: 'motorway' }
  );

  // Upper West Horizontal
  rawEdges.push(
    { from: 'w-timberline-junction', to: 'w-nw-crest', name: 'Timberline Boulevard', type: 'primary' },
    { from: 'w-nw-crest', to: 'w-crest-blvd', name: 'Skyline Ridge Way', type: 'primary' },
    { from: 'w-crest-blvd', to: 'w-north-plaza', name: 'Skyline Ridge Way', type: 'primary' },
    { from: 'w-north-plaza', to: 'w-north-waterfront', name: 'Riverwalk West Link', type: 'secondary' },
    { from: 'w-crest-blvd', to: 'w-culdesac-north', name: 'Pine Crest Lane', type: 'alley' }
  );

  // Campus District Horizontal
  rawEdges.push(
    { from: 'w-campus-north-gate', to: 'w-univ-gate', name: 'Campus Perimeter Drive', type: 'secondary' },
    { from: 'w-univ-gate', to: 'w-univ-quad', name: 'University Way', type: 'secondary' },
    { from: 'w-univ-quad', to: 'w-library-sq', name: 'University Way', type: 'secondary' },
    { from: 'w-library-sq', to: 'w-bridge-north-approach', name: 'Arch Bridge Boulevard', type: 'primary' }
  );

  // Upper East Horizontal
  rawEdges.push(
    { from: 'e-north-waterfront', to: 'e-grand-circus', name: 'Grand Circus Drive', type: 'primary', curvature: 0.04 },
    { from: 'e-grand-circus', to: 'e-uptown-blvd', name: 'Grand Circus Drive', type: 'primary' },
    { from: 'e-uptown-blvd', to: 'e-northeast-hills', name: 'Highland Expressway', type: 'primary' },
    { from: 'e-northeast-hills', to: 'e-silicon-parkway', name: 'Silicon Freeway', type: 'motorway', curvature: 0.05 },

    { from: 'e-bridge-north-approach', to: 'e-tech-hub', name: 'Innovation Highway', type: 'primary' },
    { from: 'e-tech-hub', to: 'e-innovation-way', name: 'Innovation Highway', type: 'primary' },
    { from: 'e-innovation-way', to: 'e-eastgate-transit', name: 'Innovation Highway', type: 'secondary' },
    { from: 'e-eastgate-transit', to: 'e-aerotech-center', name: 'Aerotech Connector', type: 'primary' },
    { from: 'e-silicon-parkway', to: 'e-culdesac-east', name: 'Summit Vista Way', type: 'alley' }
  );

  // Downtown West Horizontal
  rawEdges.push(
    { from: 'w-sunset-junction', to: 'w-civic-center', name: 'Sunset Boulevard', type: 'motorway', curvature: 0.05 },
    { from: 'w-civic-center', to: 'w-broadway-west', name: 'Metropolitan Boulevard', type: 'primary' },
    { from: 'w-broadway-west', to: 'w-financial-sq', name: 'Metropolitan Boulevard', type: 'primary' },
    { from: 'w-financial-sq', to: 'w-mid-bridge-approach', name: 'Suspension Bridge Way', type: 'primary' },
    { from: 'w-mid-bridge-approach', to: 'w-dock-pier-3', name: 'Historic Pier 3 Pierway', type: 'residential' }
  );

  // Civic Center Downtown West Interconnects
  rawEdges.push(
    { from: 'w-civic-center', to: 'w-central-post', name: 'Post Street', type: 'secondary' },
    { from: 'w-central-post', to: 'w-chamber-of-commerce', name: 'Executive Way', type: 'secondary' },
    { from: 'w-chamber-of-commerce', to: 'w-financial-sq', name: 'Financial Lane', type: 'secondary' },
    { from: 'w-chamber-of-commerce', to: 'w-broadway-west', name: 'Merchant Row', type: 'secondary' }
  );

  // Downtown East Horizontal
  rawEdges.push(
    { from: 'e-mid-bridge-approach', to: 'e-central-tower', name: 'Metropolis Central Ave', type: 'primary' },
    { from: 'e-central-tower', to: 'e-metro-center', name: 'Metropolis Central Ave', type: 'primary' },
    { from: 'e-metro-center', to: 'e-east-terminal', name: 'East Motorway Bypass', type: 'motorway', curvature: -0.05 },
    { from: 'e-east-terminal', to: 'e-airport-gateway', name: 'Airport Expressway', type: 'motorway' },
    { from: 'e-airport-gateway', to: 'e-airport-terminal-1', name: 'Terminal Concourse Way', type: 'primary' },
    { from: 'e-mid-bridge-approach', to: 'e-pier-9-terminal', name: 'Pier 9 Causeway', type: 'residential' }
  );

  // Downtown East Financial Interconnects
  rawEdges.push(
    { from: 'e-central-tower', to: 'e-financial-avenue', name: 'Financial Plaza Way', type: 'secondary' },
    { from: 'e-financial-avenue', to: 'e-stock-exchange', name: 'Exchange Boulevard', type: 'secondary' },
    { from: 'e-stock-exchange', to: 'e-metro-center', name: 'Trading Floor Lane', type: 'secondary' }
  );

  // Arts District & Old Town Horizontal (West)
  rawEdges.push(
    { from: 'w-west-valley-ave', to: 'w-arts-quarter', name: 'Grand Arts Boulevard', type: 'primary' },
    { from: 'w-arts-quarter', to: 'w-theatre-row', name: 'Theatre Boulevard', type: 'secondary' },
    { from: 'w-theatre-row', to: 'w-old-market', name: 'Theatre Boulevard', type: 'secondary' },
    { from: 'w-old-market', to: 'w-south-bridge-approach', name: 'Stone Bridge Approach', type: 'primary' },
    { from: 'w-arts-quarter', to: 'w-artisan-village', name: 'Artisan Mews', type: 'secondary' },
    { from: 'w-artisan-village', to: 'w-historic-clocktower', name: 'Cobblestone Way', type: 'secondary' },
    { from: 'w-historic-clocktower', to: 'w-old-market', name: 'Old Market Lane', type: 'secondary' },
    { from: 'w-arts-quarter', to: 'w-alley-deadend', name: 'Sculptor Alley', type: 'alley' }
  );

  // Marina & Harbor Horizontal (East)
  rawEdges.push(
    { from: 'e-south-bridge-approach', to: 'e-harbor-blvd', name: 'Harbor Access Road', type: 'primary' },
    { from: 'e-harbor-blvd', to: 'e-marina-center', name: 'Harbor Access Road', type: 'secondary' },
    { from: 'e-marina-center', to: 'e-coastal-express', name: 'Ocean Parkway', type: 'primary' },
    { from: 'e-coastal-express', to: 'e-coastal-gateway', name: 'East Ocean Expressway', type: 'motorway', curvature: 0.05 },
    { from: 'e-harbor-blvd', to: 'e-yacht-haven', name: 'Yacht Club Drive', type: 'secondary' },
    { from: 'e-yacht-haven', to: 'e-regatta-wharf', name: 'Regatta Esplanade', type: 'secondary' },
    { from: 'e-regatta-wharf', to: 'e-marina-center', name: 'Wharf Connector', type: 'secondary' },
    { from: 'e-marina-center', to: 'e-harbor-lighthouse', name: 'Lighthouse Promenade', type: 'alley' }
  );

  // South Suburbs & Rail Depot Horizontal (West)
  rawEdges.push(
    { from: 'w-horizon-crossing', to: 'w-south-terminal', name: 'Horizon Freeway', type: 'motorway' },
    { from: 'w-south-terminal', to: 'w-industrial-park', name: 'South Industrial Parkway', type: 'primary' },
    { from: 'w-industrial-park', to: 'w-railyard-junction', name: 'South Industrial Parkway', type: 'secondary' },
    { from: 'w-railyard-junction', to: 'w-south-pier-approach', name: 'Promenade West', type: 'secondary' },
    { from: 'w-south-terminal', to: 'w-freight-spur', name: 'Freight Terminal Loop', type: 'secondary' },
    { from: 'w-freight-spur', to: 'w-rail-depot-central', name: 'Depot Yard Way', type: 'secondary' },
    { from: 'w-rail-depot-central', to: 'w-railyard-junction', name: 'Main Freight Spine', type: 'secondary' }
  );

  // Port Logistics Horizontal (East)
  rawEdges.push(
    { from: 'e-south-waterfront', to: 'e-cargo-wharf', name: 'Port Road 1', type: 'secondary' },
    { from: 'e-cargo-wharf', to: 'e-port-logistics', name: 'Port Road 1', type: 'secondary' },
    { from: 'e-port-logistics', to: 'e-southeast-depot', name: 'Port Expressway', type: 'primary' },
    { from: 'e-southeast-depot', to: 'e-logistics-corridor', name: 'Logistics Outer Freeway', type: 'motorway' },
    { from: 'e-cargo-wharf', to: 'e-container-yard', name: 'Container Access Way', type: 'secondary' },
    { from: 'e-container-yard', to: 'e-customs-wharf', name: 'Customs Wharf Boulevard', type: 'secondary' },
    { from: 'e-customs-wharf', to: 'e-southeast-depot', name: 'Dockside Expressway', type: 'secondary' }
  );

  // Far South Oceanfront Horizontal (West & East)
  rawEdges.push(
    { from: 'w-bayfront-southwest', to: 'w-refinery-gate', name: 'Ocean Coastal Boulevard', type: 'motorway', curvature: -0.05 },
    { from: 'w-refinery-gate', to: 'w-container-wharf-south', name: 'Refinery Access Highway', type: 'primary' },
    { from: 'w-container-wharf-south', to: 'w-ocean-bridge-west', name: 'Viaduct West Approach', type: 'primary' },
    { from: 'w-refinery-gate', to: 'w-salt-marsh-pier', name: 'Marsh Pier Way', type: 'alley' },

    { from: 'e-ocean-bridge-east', to: 'e-deepwater-berth', name: 'Viaduct East Approach', type: 'primary' },
    { from: 'e-deepwater-berth', to: 'e-south-terminal-port', name: 'Port Gateway Expressway', type: 'primary' },
    { from: 'e-south-terminal-port', to: 'e-coastal-causeway-south', name: 'Causeway Parkway', type: 'motorway', curvature: 0.06 },
    { from: 'e-south-terminal-port', to: 'e-ocean-jetty', name: 'Jetty Access', type: 'alley' }
  );

  // Vertical Street Grids & Avenues (West)
  rawEdges.push(
    // Far West Corridor (Sunset & Timberline)
    { from: 'w-timberline-junction', to: 'w-campus-north-gate', name: 'Timberline Spine', type: 'primary' },
    { from: 'w-campus-north-gate', to: 'w-sunset-junction', name: 'West Valley Expressway', type: 'motorway' },
    { from: 'w-sunset-junction', to: 'w-west-valley-ave', name: 'West Valley Expressway', type: 'motorway' },
    { from: 'w-west-valley-ave', to: 'w-horizon-crossing', name: 'West Valley Expressway', type: 'motorway' },
    { from: 'w-horizon-crossing', to: 'w-bayfront-southwest', name: 'West Ocean Coastal Bypass', type: 'motorway', curvature: 0.05 },

    // 1st Avenue West
    { from: 'w-nw-crest', to: 'w-univ-gate', name: '1st Avenue West', type: 'primary' },
    { from: 'w-univ-gate', to: 'w-civic-center', name: '1st Avenue West', type: 'primary' },
    { from: 'w-civic-center', to: 'w-arts-quarter', name: '1st Avenue West', type: 'primary' },
    { from: 'w-arts-quarter', to: 'w-south-terminal', name: '1st Avenue West', type: 'primary' },
    { from: 'w-south-terminal', to: 'w-refinery-gate', name: 'Refinery Parkway', type: 'primary' },

    // 2nd Avenue West
    { from: 'w-crest-blvd', to: 'w-univ-quad', name: '2nd Avenue West', type: 'secondary' },
    { from: 'w-univ-quad', to: 'w-broadway-west', name: '2nd Avenue West', type: 'secondary' },
    { from: 'w-broadway-west', to: 'w-theatre-row', name: '2nd Avenue West', type: 'secondary' },
    { from: 'w-theatre-row', to: 'w-industrial-park', name: '2nd Avenue West', type: 'secondary' },
    { from: 'w-industrial-park', to: 'w-freight-spur', name: 'South Industrial Link', type: 'secondary' },

    // 3rd Avenue West
    { from: 'w-north-plaza', to: 'w-library-sq', name: '3rd Avenue West', type: 'secondary' },
    { from: 'w-library-sq', to: 'w-financial-sq', name: '3rd Avenue West', type: 'secondary' },
    { from: 'w-financial-sq', to: 'w-old-market', name: '3rd Avenue West', type: 'secondary' },
    { from: 'w-old-market', to: 'w-railyard-junction', name: '3rd Avenue West', type: 'secondary' },
    { from: 'w-railyard-junction', to: 'w-container-wharf-south', name: 'Container Berth Access', type: 'primary' },

    // West Promenade Riverwalk
    { from: 'w-north-waterfront', to: 'w-bridge-north-approach', name: 'West Promenade North', type: 'secondary', curvature: -0.06 },
    { from: 'w-bridge-north-approach', to: 'w-mid-bridge-approach', name: 'West Promenade Central', type: 'secondary', curvature: 0.05 },
    { from: 'w-mid-bridge-approach', to: 'w-south-bridge-approach', name: 'West Promenade South', type: 'secondary', curvature: -0.04 },
    { from: 'w-south-bridge-approach', to: 'w-south-pier-approach', name: 'West Esplanade', type: 'secondary', curvature: 0.06 },
    { from: 'w-south-pier-approach', to: 'w-ocean-bridge-west', name: 'South Riverwalk Esplanade', type: 'primary', curvature: -0.05 }
  );

  // Vertical Street Grids & Avenues (East)
  rawEdges.push(
    // East Riverwalk Promenade
    { from: 'e-north-waterfront', to: 'e-bridge-north-approach', name: 'East Riverwalk North', type: 'secondary', curvature: 0.05 },
    { from: 'e-bridge-north-approach', to: 'e-mid-bridge-approach', name: 'East Riverwalk Central', type: 'secondary', curvature: -0.06 },
    { from: 'e-mid-bridge-approach', to: 'e-south-bridge-approach', name: 'East Riverwalk South', type: 'secondary', curvature: 0.04 },
    { from: 'e-south-bridge-approach', to: 'e-south-waterfront', name: 'East Pier Boulevard', type: 'secondary', curvature: -0.05 },
    { from: 'e-south-waterfront', to: 'e-ocean-bridge-east', name: 'Lower East Promenade', type: 'primary', curvature: 0.05 },

    // 5th Avenue East
    { from: 'e-grand-circus', to: 'e-tech-hub', name: '5th Avenue East', type: 'primary' },
    { from: 'e-tech-hub', to: 'e-central-tower', name: '5th Avenue East', type: 'primary' },
    { from: 'e-central-tower', to: 'e-harbor-blvd', name: '5th Avenue East', type: 'primary' },
    { from: 'e-harbor-blvd', to: 'e-cargo-wharf', name: '5th Avenue East', type: 'secondary' },
    { from: 'e-cargo-wharf', to: 'e-deepwater-berth', name: 'Wharf South Avenue', type: 'primary' },

    // 6th Avenue East
    { from: 'e-uptown-blvd', to: 'e-innovation-way', name: '6th Avenue East', type: 'secondary' },
    { from: 'e-innovation-way', to: 'e-metro-center', name: '6th Avenue East', type: 'secondary' },
    { from: 'e-metro-center', to: 'e-marina-center', name: '6th Avenue East', type: 'secondary' },
    { from: 'e-marina-center', to: 'e-port-logistics', name: '6th Avenue East', type: 'secondary' },
    { from: 'e-port-logistics', to: 'e-south-terminal-port', name: 'Passenger Port Road', type: 'primary' },

    // 7th Avenue / Metro Perimeter East
    { from: 'e-northeast-hills', to: 'e-eastgate-transit', name: 'Metropolitan Perimeter Loop', type: 'motorway', curvature: 0.08 },
    { from: 'e-eastgate-transit', to: 'e-east-terminal', name: 'Metropolitan Perimeter Loop', type: 'motorway' },
    { from: 'e-east-terminal', to: 'e-coastal-express', name: 'Metropolitan Perimeter Loop', type: 'motorway' },
    { from: 'e-coastal-express', to: 'e-southeast-depot', name: 'Metropolitan Perimeter Loop', type: 'motorway', curvature: 0.06 },
    { from: 'e-southeast-depot', to: 'e-coastal-causeway-south', name: 'South Ocean Parkway', type: 'motorway', curvature: 0.05 },

    // Far East Airport & Outer Highway Corridor
    { from: 'e-silicon-parkway', to: 'e-aerotech-center', name: 'Silicon Outer Expressway', type: 'motorway' },
    { from: 'e-aerotech-center', to: 'e-airport-gateway', name: 'Aerotech Highway', type: 'motorway' },
    { from: 'e-airport-gateway', to: 'e-coastal-gateway', name: 'Airport Perimeter Highway', type: 'motorway' },
    { from: 'e-coastal-gateway', to: 'e-logistics-corridor', name: 'Port Airport Connector', type: 'motorway' }
  );

  // Diagonal & Express Highways (West & East)
  rawEdges.push(
    // West Diagonal Broadway
    { from: 'w-nw-crest', to: 'w-broadway-west', name: 'Grand Diagonal Expressway', type: 'motorway', curvature: 0.08 },
    { from: 'w-broadway-west', to: 'w-old-market', name: 'Diagonal Broadway', type: 'primary', curvature: -0.05 },
    { from: 'w-old-market', to: 'w-south-terminal', name: 'Southwest Shortcut', type: 'secondary' },
    { from: 'w-sunset-junction', to: 'w-univ-quad', name: 'Sunset Campus Connector', type: 'primary' },

    // East Diagonal Capital Highway
    { from: 'e-grand-circus', to: 'e-metro-center', name: 'Capital Diagonal', type: 'primary', curvature: -0.06 },
    { from: 'e-tech-hub', to: 'e-east-terminal', name: 'East Connector Freeway', type: 'motorway', curvature: 0.05 },
    { from: 'e-metro-center', to: 'e-port-logistics', name: 'Commercial Diagonal', type: 'secondary' },
    { from: 'e-uptown-blvd', to: 'e-aerotech-center', name: 'Skyway Boulevard', type: 'primary' }
  );

  // --- 6 CRITICAL RIVER BRIDGES (NORTH TO SOUTH) ---
  // Bridge 1 (Far North): High Gorge Cable Bridge
  rawEdges.push({
    from: 'w-gorge-bridge-west',
    to: 'e-gorge-bridge-east',
    name: 'High Gorge Cable Bridge',
    type: 'bridge',
    curvature: 0.05,
  });

  // Bridge 2 (Upper Mid): Grand Arch Bridge
  rawEdges.push({
    from: 'w-bridge-north-approach',
    to: 'e-bridge-north-approach',
    name: 'Grand Arch Bridge',
    type: 'bridge',
    curvature: 0.04,
  });

  // Bridge 3 (Central Downtown): Metropolis Suspension Bridge
  rawEdges.push({
    from: 'w-mid-bridge-approach',
    to: 'e-mid-bridge-approach',
    name: 'Metropolis Suspension Bridge',
    type: 'bridge',
    curvature: -0.03,
  });

  // Bridge 4 & 5 (Central River Island Crossing)
  rawEdges.push(
    { from: 'w-financial-sq', to: 'island-north', name: 'Island West Viaduct', type: 'bridge', curvature: 0.05 },
    { from: 'island-north', to: 'e-central-tower', name: 'Island East Viaduct', type: 'bridge', curvature: -0.04 },
    { from: 'island-north', to: 'island-south', name: 'Island Park Avenue', type: 'residential' },
    { from: 'island-south', to: 'w-old-market', name: 'Island South West Bridge', type: 'bridge' },
    { from: 'island-south', to: 'e-harbor-blvd', name: 'Island South East Bridge', type: 'bridge' }
  );

  // Bridge 6 (Lower Mid): Historic Old Stone Bridge
  rawEdges.push({
    from: 'w-south-bridge-approach',
    to: 'e-south-bridge-approach',
    name: 'Historic Old Stone Bridge',
    type: 'bridge',
    curvature: 0.02,
  });

  // Bridge 7 (Far South): South Bay Viaduct
  rawEdges.push({
    from: 'w-ocean-bridge-west',
    to: 'e-ocean-bridge-east',
    name: 'South Bay Viaduct',
    type: 'bridge',
    curvature: -0.04,
  });

  // One-way corridors to test directionality
  rawEdges.push(
    { from: 'w-broadway-west', to: 'w-financial-sq', name: 'Commerce One-Way', type: 'secondary', oneWay: true, curvature: 0.04 },
    { from: 'e-central-tower', to: 'e-tech-hub', name: 'Tech One-Way', type: 'secondary', oneWay: true, curvature: -0.03 },
    { from: 'e-metro-center', to: 'e-east-terminal', name: 'Eastbound Express One-Way', type: 'motorway', oneWay: true }
  );

  // 5. Build Graph Nodes & Adjacency Map
  const nodes = new Map<string, RoadNode>();
  for (const n of intersectionList) {
    nodes.set(n.id, {
      id: n.id,
      lat: n.lat,
      lng: n.lng,
      name: n.name,
    });
  }

  const adjacency = new Map<string, RoadEdge[]>();
  const roadSegments: CityRoadSegment[] = [];
  let edgeCount = 0;

  const addDirectedEdge = (
    fromId: string,
    toId: string,
    dist: number,
    oneWay: boolean,
    type: RoadType,
    name: string,
    geometry: [number, number][]
  ) => {
    if (!adjacency.has(fromId)) {
      adjacency.set(fromId, []);
    }
    const list = adjacency.get(fromId)!;
    if (!list.some((e) => e.to === toId)) {
      list.push({
        to: toId,
        distanceMeters: dist,
        oneWay,
        highwayType: type,
        name,
        geometry,
      });
      edgeCount++;
    }
  };

  rawEdges.forEach((re, index) => {
    const u = nodeMap.get(re.from);
    const v = nodeMap.get(re.to);
    if (!u || !v) return;

    const p1: [number, number] = [u.lat, u.lng];
    const p2: [number, number] = [v.lat, v.lng];

    const forwardGeom: [number, number][] =
      re.customGeom && re.customGeom.length >= 2
        ? re.customGeom
        : generateCurvedPoints(p1, p2, re.curvature || 0, 5);

    const dist = computeGeometryDistance(forwardGeom);

    const segmentId = `road-seg-${index}`;
    roadSegments.push({
      id: segmentId,
      from: re.from,
      to: re.to,
      name: re.name,
      type: re.type,
      oneWay: !!re.oneWay,
      distanceMeters: dist,
      geometry: forwardGeom,
    });

    addDirectedEdge(re.from, re.to, dist, !!re.oneWay, re.type, re.name, forwardGeom);

    if (!re.oneWay) {
      const backwardGeom = forwardGeom.slice().reverse();
      addDirectedEdge(re.to, re.from, dist, false, re.type, re.name, backwardGeom);
    }
  });

  // 6. Predefined Scenarios (Spanning all sectors of the city)
  const scenarios: CityScenario[] = [
    {
      id: 'scenario-downtown-cross-river',
      name: 'Downtown Trans-River Crossing',
      description: 'Travel from Civic Center West across the Suspension Bridge to Metropolis Tower Plaza. Compares shortest distance vs minimum turns.',
      startNodeId: 'w-civic-center',
      destNodeId: 'e-central-tower',
      highlightBridge: true,
    },
    {
      id: 'scenario-observatory-to-deepwater-port',
      name: 'Observatory Summit to Deepwater Ocean Port',
      description: 'Full-screen cross-city journey from Far Northwest Observatory Peak down to Southeast Ocean Terminal across 8+ km of dense network.',
      startNodeId: 'w-observatory-peak',
      destNodeId: 'e-south-terminal-port',
    },
    {
      id: 'scenario-diagonal-expressway',
      name: 'Northwest Heights to Port Terminal',
      description: 'Long cross-city journey from Northwest Crest to Southeast Rail Depot. Highlighting the choice between high-speed highway bypass vs city grid.',
      startNodeId: 'w-nw-crest',
      destNodeId: 'e-southeast-depot',
    },
    {
      id: 'scenario-airport-to-sunset',
      name: 'Airport Terminal to Sunset Boulevard',
      description: 'Cross-metropolis east-to-west arterial traverse from International Airport to Sunset Boulevard.',
      startNodeId: 'e-airport-terminal-1',
      destNodeId: 'w-sunset-junction',
    },
    {
      id: 'scenario-six-bridges',
      name: 'Riverfront Six Bridges Challenge',
      description: 'Starts at University Gate heading to East Marina. Compares routing through 6 distinct bridges with divergent heuristic choices.',
      startNodeId: 'w-univ-gate',
      destNodeId: 'e-marina-center',
      highlightBridge: true,
    },
    {
      id: 'scenario-deadend-pier-challenge',
      name: 'Eagle Canyon to Salt Marsh Pier',
      description: 'Extreme test navigating between dead-ends and obstacle bottlenecks. Stretches DFS and Greedy search capabilities.',
      startNodeId: 'w-canyon-deadend',
      destNodeId: 'w-salt-marsh-pier',
    },
  ];

  const graph: RoadGraph = {
    nodes,
    adjacency,
    nodeCount: nodes.size,
    edgeCount,
    bounds: { minLat, maxLat, minLng, maxLng },
    sourceName: `RouteX Metropolis Sim (Seed: ${numericSeed})`,
  };

  return {
    seed: numericSeed,
    name: 'RouteX Metropolis Simulation',
    graph,
    intersections: intersectionList,
    roads: roadSegments,
    waterCorridors: [river],
    parks,
    scenarios,
    bounds: { minLat, maxLat, minLng, maxLng },
  };
}

/**
 * Pre-instantiated default city simulation for immediate offline usage.
 */
export const DEFAULT_SYNTHETIC_CITY = generateSyntheticCity(42);

/**
 * Converts any existing RoadGraph into a SyntheticCity structure.
 */
export function roadGraphToSyntheticCity(
  graph: RoadGraph,
  name: string,
  defaultStartId: string,
  defaultDestId: string,
  description?: string
): SyntheticCity {
  const intersections: CityIntersection[] = [];
  for (const node of graph.nodes.values()) {
    intersections.push({
      id: node.id,
      lat: node.lat,
      lng: node.lng,
      name: node.name || node.id,
      district: 'City Center',
    });
  }

  const roads: CityRoadSegment[] = [];
  const processedEdges = new Set<string>();
  let roadIndex = 0;

  for (const [fromId, edges] of graph.adjacency.entries()) {
    for (const e of edges) {
      const key1 = `${fromId}->${e.to}`;
      const key2 = `${e.to}->${fromId}`;

      if (!e.oneWay && (processedEdges.has(key1) || processedEdges.has(key2))) {
        continue;
      }
      processedEdges.add(key1);

      roads.push({
        id: `sample-road-${roadIndex++}`,
        from: fromId,
        to: e.to,
        name: e.name || 'City Street',
        type: (e.highwayType as RoadType) || 'primary',
        oneWay: e.oneWay,
        distanceMeters: e.distanceMeters,
        geometry: e.geometry,
      });
    }
  }

  const scenarios: CityScenario[] = [
    {
      id: `scenario-${graph.sourceName || 'extract'}`,
      name: `${name} Standard Route`,
      description: description || `Traversal across ${name}`,
      startNodeId: defaultStartId,
      destNodeId: defaultDestId,
    },
  ];

  return {
    seed: 100,
    name,
    graph,
    intersections,
    roads,
    waterCorridors: [],
    parks: [],
    scenarios,
    bounds: graph.bounds,
  };
}
