import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Loader2,
  Info,
  RotateCcw,
  Search,
  X,
  ArrowUpDown,
  Car,
  Compass,
  Maximize2,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  GitBranch,
  Activity,
  Sliders,
  TrendingDown,
  Download,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in Vite/bundler environment
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import {
  RoadGraph,
  GraphAlgorithmName,
  GraphAlgorithmResult,
  SnappedLocation,
  runAllGraphAlgorithms,
  findNearestRoadNode,
  fetchLiveRoadGraph,
  PREDEFINED_ROAD_AREAS,
  haversineDistanceMeters,
} from '../algorithms/graph';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom styled markers
const startIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'hue-rotate-[120deg]', // Green tint
});

const endIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'hue-rotate-[310deg]', // Pink/magenta tint
});

export interface LocationPoint {
  lat: number;
  lng: number;
  name: string;
  displayName: string;
}

export interface RouteInfo {
  coordinates: [number, number][]; // [lat, lng] array
  distance: number; // meters
  duration: number; // seconds
  startName: string;
  endName: string;
}

// Distinct algorithm styling colors
const ALGO_COLORS: Record<
  GraphAlgorithmName | 'OSRM',
  { color: string; bg: string; text: string; border: string }
> = {
  Dijkstra: { color: '#06b6d4', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'A*': { color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  BFS: { color: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  Greedy: { color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  DFS: { color: '#ec4899', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  OSRM: { color: '#94a3b8', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const ALL_ALGO_KEYS: GraphAlgorithmName[] = ['Dijkstra', 'A*', 'BFS', 'Greedy', 'DFS'];

// Geocode location search using Nominatim with Photon fallback
async function searchPlaces(query: string, signal?: AbortSignal): Promise<LocationPoint[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      signal,
      headers: { 'Accept-Language': 'en' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => {
          const parts = (item.display_name || '').split(',');
          const name = parts[0]?.trim() || item.name || trimmed;
          return {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            name,
            displayName: item.display_name,
          };
        });
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
  }

  // Fallback to Photon
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5&lang=en`;
    const res = await fetch(photonUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features)) {
        return data.features.map(
          (f: {
            geometry: { coordinates: [number, number] };
            properties: { name?: string; city?: string; state?: string; country?: string };
          }) => {
            const p = f.properties;
            const name = p.name || p.city || trimmed;
            const sub = [p.name, p.city, p.state, p.country].filter(Boolean).join(', ');
            return {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              name,
              displayName: sub || name,
            };
          }
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
  }

  return [];
}

// Reverse geocode
async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`;
    const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) return data.display_name;
    }
  } catch {
    // Ignore fallback
  }
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

// --- Map View & Bounds Controller Component ---
function MapBoundsController({
  algorithmResults,
  visibleAlgorithms,
  osrmRoute,
  startPoint,
  endPoint,
  fitTrigger,
}: {
  algorithmResults: Record<GraphAlgorithmName, GraphAlgorithmResult> | null;
  visibleAlgorithms: Record<GraphAlgorithmName | 'OSRM', boolean>;
  osrmRoute: RouteInfo | null;
  startPoint: LocationPoint | null;
  endPoint: LocationPoint | null;
  fitTrigger: number;
}) {
  const map = useMap();

  const fitBoundsHandler = useCallback(() => {
    map.invalidateSize();

    // Collect all coordinates from visible paths
    const allCoords: [number, number][] = [];

    if (algorithmResults) {
      for (const [algoName, res] of Object.entries(algorithmResults) as [
        GraphAlgorithmName,
        GraphAlgorithmResult
      ][]) {
        if (visibleAlgorithms[algoName] && res.pathCoordinates.length > 0) {
          allCoords.push(...res.pathCoordinates);
        }
      }
    }

    if (visibleAlgorithms.OSRM && osrmRoute && osrmRoute.coordinates.length > 0) {
      allCoords.push(...osrmRoute.coordinates);
    }

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
        });
        return;
      }
    }

    // Fallback to start and end points
    if (startPoint && endPoint) {
      const dist = Math.hypot(startPoint.lat - endPoint.lat, startPoint.lng - endPoint.lng);
      if (dist < 0.0005) {
        map.setView([startPoint.lat, startPoint.lng], 14, { animate: true });
      } else {
        const bounds = L.latLngBounds([
          [startPoint.lat, startPoint.lng],
          [endPoint.lat, endPoint.lng],
        ]);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
        }
      }
    } else if (startPoint) {
      map.setView([startPoint.lat, startPoint.lng], 12, { animate: true });
    } else if (endPoint) {
      map.setView([endPoint.lat, endPoint.lng], 12, { animate: true });
    }
  }, [map, algorithmResults, visibleAlgorithms, osrmRoute, startPoint, endPoint]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitBoundsHandler();
    }, 80);
    return () => clearTimeout(timer);
  }, [fitBoundsHandler, fitTrigger]);

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return null;
}

// --- Map Click Handler Component ---
function MapClickHandler({
  clickMode,
  onMapClick,
}: {
  clickMode: 'start' | 'end' | 'none';
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (clickMode !== 'none') {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// --- Search Input with Autocomplete Component ---
interface SearchInputProps {
  id: string;
  label: string;
  point: LocationPoint | null;
  onSelectPoint: (point: LocationPoint | null) => void;
  accent: 'green' | 'pink';
  placeholder: string;
}

function LocationSearchInput({
  id,
  label,
  point,
  onSelectPoint,
  accent,
  placeholder,
}: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Synchronize input text when point prop changes
  const [prevPoint, setPrevPoint] = useState<LocationPoint | null>(point);
  if (point !== prevPoint) {
    setPrevPoint(point);
    setQuery(point ? point.name || point.displayName || '' : '');
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!val.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      setIsOpen(false);
      onSelectPoint(null);
      return;
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(val, controller.signal);
        setSuggestions(results);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  };

  const handleSelect = (item: LocationPoint) => {
    setQuery(item.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelectPoint(item);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onSelectPoint(null);
  };

  const accentColor = accent === 'green' ? 'text-green-400' : 'text-pink-400';
  const accentBorder = accent === 'green' ? 'focus-within:border-green-500/50' : 'focus-within:border-pink-500/50';
  const badgeBg =
    accent === 'green'
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : 'bg-pink-500/10 text-pink-400 border-pink-500/20';

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      <div className="flex items-center justify-between text-xs font-medium">
        <label htmlFor={id} className={`flex items-center gap-1.5 ${accentColor}`}>
          <MapPin size={13} />
          {label}
        </label>
        {point && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeBg}`}>
            {point.lat.toFixed(3)}, {point.lng.toFixed(3)}
          </span>
        )}
      </div>

      <div
        className={`relative flex items-center bg-navy-900 border border-slate-border rounded-lg transition-colors ${accentBorder}`}
      >
        <Search size={14} className="ml-2.5 text-gray-500 shrink-0" />
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
        />

        {isSearching && <Loader2 size={14} className="mr-2 text-cyan-accent animate-spin shrink-0" />}

        {query && !isSearching && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 p-0.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Clear location"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-navy-800 border border-slate-border rounded-lg shadow-2xl max-h-56 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <button
                key={`${item.lat}-${item.lng}-${index}`}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/60 border-b border-slate-border/40 last:border-0 transition-colors flex items-start gap-2"
              >
                <MapPin size={14} className={`${accentColor} shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate">{item.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{item.displayName}</div>
                </div>
              </button>
            ))
          ) : !isSearching && query.trim().length >= 2 ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">
              No matching locations found. Try city, state, or coordinates.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function getInitialEndpoints(areaId: string): {
  start: LocationPoint | null;
  end: LocationPoint | null;
  graph: RoadGraph | null;
} {
  const area = PREDEFINED_ROAD_AREAS.find((a) => a.id === areaId);
  if (!area) return { start: null, end: null, graph: null };
  const sNode = area.graph.nodes.get(area.defaultStartId);
  const dNode = area.graph.nodes.get(area.defaultDestId);
  return {
    start: sNode
      ? {
          lat: sNode.lat,
          lng: sNode.lng,
          name: sNode.name || area.defaultStartId,
          displayName: `${sNode.name || area.defaultStartId}, ${area.city}, ${area.country}`,
        }
      : null,
    end: dNode
      ? {
          lat: dNode.lat,
          lng: dNode.lng,
          name: dNode.name || area.defaultDestId,
          displayName: `${dNode.name || area.defaultDestId}, ${area.city}, ${area.country}`,
        }
      : null,
    graph: area.graph,
  };
}

// --- Main MapDemo Page Component ---
export function MapDemo() {
  const initialEndpoints = useMemo(() => getInitialEndpoints('london-central'), []);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('london-central');
  const [startPoint, setStartPoint] = useState<LocationPoint | null>(initialEndpoints.start);
  const [endPoint, setEndPoint] = useState<LocationPoint | null>(initialEndpoints.end);
  const [clickMode, setClickMode] = useState<'start' | 'end' | 'none'>('none');

  // Road Graph and Algorithm Comparison State
  const [activeGraph, setActiveGraph] = useState<RoadGraph | null>(initialEndpoints.graph);
  const [snappedStart, setSnappedStart] = useState<SnappedLocation | null>(null);
  const [snappedDest, setSnappedDest] = useState<SnappedLocation | null>(null);
  const [algorithmResults, setAlgorithmResults] = useState<Record<
    GraphAlgorithmName,
    GraphAlgorithmResult
  > | null>(null);

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<GraphAlgorithmName | 'OSRM' | null>(null);
  const [visibleAlgorithms, setVisibleAlgorithms] = useState<Record<GraphAlgorithmName | 'OSRM', boolean>>({
    Dijkstra: true,
    'A*': true,
    BFS: true,
    Greedy: true,
    DFS: true,
    OSRM: false, // OSRM off by default in algorithm comparison
  });

  // OSRM external route
  const [osrmRoute, setOsrmRoute] = useState<RouteInfo | null>(null);
  const [loadingOSRM, setLoadingOSRM] = useState(false);

  // Status & loading
  const [isComparing, setIsComparing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const activeAbortRef = useRef<AbortController | null>(null);

  // Fetch optional OSRM reference route
  const fetchOSRMReference = useCallback(async (s: LocationPoint, d: LocationPoint) => {
    try {
      setLoadingOSRM(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${s.lng},${s.lat};${d.lng},${d.lat}?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          const coords: [number, number][] = r.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          setOsrmRoute({
            coordinates: coords,
            distance: r.distance,
            duration: r.duration,
            startName: s.name,
            endName: d.name,
          });
        }
      }
    } catch {
      // Non-fatal reference failure
    } finally {
      setLoadingOSRM(false);
    }
  }, []);

  // Handle switching predefined areas
  const handleSelectArea = (areaId: string) => {
    setSelectedAreaId(areaId);
    if (areaId === 'custom') {
      setActiveGraph(null);
      setAlgorithmResults(null);
      setOsrmRoute(null);
      return;
    }
    const data = getInitialEndpoints(areaId);
    setStartPoint(data.start);
    setEndPoint(data.end);
    setActiveGraph(data.graph);
    setAlgorithmResults(null);
    setOsrmRoute(null);
    setErrorMessage(null);
    setFitTrigger((prev) => prev + 1);
  };

  // Run the 5 algorithms comparison on the road graph
  const handleRunComparison = useCallback(
    async (overrideStart?: LocationPoint, overrideEnd?: LocationPoint) => {
      const s = overrideStart || startPoint;
      const d = overrideEnd || endPoint;

      if (!s || !d) {
        setErrorMessage('Please select both a Start location and Destination to run the algorithm comparison.');
        return;
      }

      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      setIsComparing(true);
      setErrorMessage(null);
      setStatusMessage('Acquiring road network graph…');

      try {
        let graphToUse: RoadGraph | null = null;
        let snapS: SnappedLocation | null = null;
        let snapD: SnappedLocation | null = null;

        // Check if endpoints are physically identical or too close (< 25m) to be distinct routing locations
        const directDist = haversineDistanceMeters(s.lat, s.lng, d.lat, d.lng);
        if (directDist < 25) {
          throw new Error(
            `Start and destination locations are virtually identical (${Math.round(
              directDist
            )} m apart). Please choose two distinct locations along the road network.`
          );
        }

        // 1. Try finding a built-in metropolitan road network where both s and d snap to DISTINCT nodes
        const candidateAreas = [...PREDEFINED_ROAD_AREAS];
        const preferredIdx = candidateAreas.findIndex((a) => a.id === selectedAreaId);
        if (preferredIdx > 0) {
          const [pref] = candidateAreas.splice(preferredIdx, 1);
          candidateAreas.unshift(pref);
        }

        if (selectedAreaId !== 'custom') {
          for (const area of candidateAreas) {
            // Find nearest node within 3,500m
            const sCandidate = findNearestRoadNode(area.graph, s.lat, s.lng, 3500);
            const dCandidate = findNearestRoadNode(area.graph, d.lat, d.lng, 3500);

            // Crucial: Both must be valid AND must be distinct nodes in this network!
            if (sCandidate && dCandidate && sCandidate.nodeId !== dCandidate.nodeId) {
              graphToUse = area.graph;
              snapS = sCandidate;
              snapD = dCandidate;
              if (selectedAreaId !== area.id) {
                setSelectedAreaId(area.id);
              }
              break;
            }
          }
        }

        // 2. If no built-in network has distinct nodes or user chose custom, attempt live Overpass extraction
        if (!graphToUse || !snapS || !snapD) {
          setStatusMessage('Querying OpenStreetMap Overpass for live road network segments…');
          const fetchRes = await fetchLiveRoadGraph(s.lat, s.lng, d.lat, d.lng, controller.signal);

          if (fetchRes.graph) {
            const sCandidate = findNearestRoadNode(fetchRes.graph, s.lat, s.lng, 4000);
            const dCandidate = findNearestRoadNode(fetchRes.graph, d.lat, d.lng, 4000);
            if (sCandidate && dCandidate && sCandidate.nodeId !== dCandidate.nodeId) {
              graphToUse = fetchRes.graph;
              snapS = sCandidate;
              snapD = dCandidate;
              setSelectedAreaId('custom');
            }
          }

          if (!graphToUse || !snapS || !snapD) {
            const errorDetail = fetchRes.error
              ? fetchRes.error
              : 'Could not connect the chosen coordinates to distinct drivable road intersections.';
            throw new Error(
              `${errorDetail}\n\nTip: You can select one of our verified metropolitan road networks (Central London, Manhattan, or Mumbai) from the tabs above to compare all 5 algorithms immediately without network restrictions.`
            );
          }
        }

        setActiveGraph(graphToUse);
        setSnappedStart(snapS);
        setSnappedDest(snapD);

        setStatusMessage('Executing BFS, DFS, Dijkstra, A*, and Greedy Best-First on road graph…');

        // Small yield to allow React to paint the loading state
        await new Promise((resolve) => setTimeout(resolve, 50));

        // EXECUTE ALL FIVE ALGORITHMS on the identical immutable graph snapshot
        const results = runAllGraphAlgorithms(graphToUse, snapS.nodeId, snapD.nodeId);

        setAlgorithmResults(results);
        setStatusMessage(null);
        setFitTrigger((prev) => prev + 1);

        // Optionally fetch OSRM reference in background if enabled or available
        fetchOSRMReference(s, d);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Error executing road graph comparison';
        setErrorMessage(msg);
        setStatusMessage(null);
      } finally {
        setIsComparing(false);
      }
    },
    [startPoint, endPoint, selectedAreaId, fetchOSRMReference]
  );

  // Map Click handler
  const handleMapClick = async (lat: number, lng: number) => {
    const formattedCoord = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

    if (clickMode === 'start') {
      const newStart: LocationPoint = {
        lat,
        lng,
        name: `Map Point (${formattedCoord})`,
        displayName: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
      setStartPoint(newStart);
      setClickMode('end');

      reverseGeocode(lat, lng).then((name) => {
        if (name && name !== formattedCoord) {
          setStartPoint((prev) =>
            prev && prev.lat === lat && prev.lng === lng
              ? { ...prev, name: name.split(',')[0], displayName: name }
              : prev
          );
        }
      });
    } else if (clickMode === 'end') {
      const newEnd: LocationPoint = {
        lat,
        lng,
        name: `Map Point (${formattedCoord})`,
        displayName: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
      setEndPoint(newEnd);
      setClickMode('none');

      reverseGeocode(lat, lng).then((name) => {
        if (name && name !== formattedCoord) {
          setEndPoint((prev) =>
            prev && prev.lat === lat && prev.lng === lng
              ? { ...prev, name: name.split(',')[0], displayName: name }
              : prev
          );
        }
      });
    }
  };

  // Swap endpoints
  const handleSwap = () => {
    const tempStart = startPoint;
    const tempEnd = endPoint;
    setStartPoint(tempEnd);
    setEndPoint(tempStart);

    if (tempEnd && tempStart) {
      handleRunComparison(tempEnd, tempStart);
    }
  };

  // Reset all
  const handleReset = useCallback(() => {
    if (activeAbortRef.current) activeAbortRef.current.abort();
    setStartPoint(null);
    setEndPoint(null);
    setAlgorithmResults(null);
    setOsrmRoute(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setSnappedStart(null);
    setSnappedDest(null);
    setClickMode('start');
    setFitTrigger((prev) => prev + 1);
  }, []);

  // Export Map Comparison to CSV
  const handleExportMapCSV = useCallback(() => {
    if (!algorithmResults || !startPoint || !endPoint) return;

    const headers = [
      'Algorithm',
      'Path Found',
      'Execution Time (ms)',
      'Nodes Expanded',
      'Nodes Discovered',
      'Path Distance (m)',
      'Path Distance (km)',
      'Traversed Edges',
      'Optimality Status',
    ];

    const rows = ALL_ALGO_KEYS.map((algo) => {
      const res = algorithmResults[algo];
      return [
        res.algorithm,
        res.pathFound ? 'Yes' : 'No',
        res.executionTimeMs.toFixed(3),
        res.nodesExpanded,
        res.nodesDiscovered,
        res.pathFound ? Math.round(res.pathDistanceMeters) : 0,
        res.pathFound ? (res.pathDistanceMeters / 1000).toFixed(3) : 'N/A',
        res.pathFound ? res.edgeCount : 0,
        `"${res.optimalityNote.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `routex-map-comparison-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [algorithmResults, startPoint, endPoint]);

  const toggleVisibility = (algo: GraphAlgorithmName | 'OSRM') => {
    setVisibleAlgorithms((prev) => ({ ...prev, [algo]: !prev[algo] }));
  };

  // Prepare chart data for Recharts
  const chartData = useMemo(() => {
    if (!algorithmResults) return [];
    return ALL_ALGO_KEYS.map((key) => {
      const res = algorithmResults[key];
      return {
        name: key,
        timeMs: Number(res.executionTimeMs.toFixed(3)),
        nodesExpanded: res.nodesExpanded,
        distanceKm: res.pathFound ? Number((res.pathDistanceMeters / 1000).toFixed(3)) : null,
        pathFound: res.pathFound,
        color: ALGO_COLORS[key].color,
      };
    });
  }, [algorithmResults]);

  const activePredefinedArea = PREDEFINED_ROAD_AREAS.find((a) => a.id === selectedAreaId);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Navigation className="text-cyan-accent" size={24} />
            Real Road Network Algorithm Comparison
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
            Benchmark BFS, DFS, Dijkstra, A*, and Greedy on actual OpenStreetMap road graphs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFitTrigger((prev) => prev + 1)}
            id="map-fit-bounds-btn"
            title="Auto-fit map to calculated routes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-slate-700/80 border border-slate-border text-gray-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Maximize2 size={13} className="text-cyan-accent" /> Fit View
          </button>
          <button
            onClick={handleReset}
            id="map-reset-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-slate-700/80 border border-slate-border text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Mode / Area Selector Tabs */}
      <div className="bg-navy-800 border border-slate-border rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sliders size={14} className="text-cyan-accent" /> Road Network Area:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PREDEFINED_ROAD_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              id={`area-tab-${area.id}`}
              onClick={() => handleSelectArea(area.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                selectedAreaId === area.id
                  ? 'bg-cyan-accent/15 border-cyan-500/50 text-cyan-accent font-semibold'
                  : 'bg-navy-900 border-slate-border text-gray-400 hover:text-white'
              }`}
            >
              <span>{area.name}</span>
              <span className="text-[10px] text-gray-500">({area.city})</span>
            </button>
          ))}

          <button
            type="button"
            id="area-tab-custom"
            onClick={() => handleSelectArea('custom')}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              selectedAreaId === 'custom'
                ? 'bg-cyan-accent/15 border-cyan-500/50 text-cyan-accent font-semibold'
                : 'bg-navy-900 border-slate-border text-gray-400 hover:text-white'
            }`}
          >
            <span>🌐 Custom Live Overpass Query</span>
          </button>
        </div>
      </div>

      {/* Active Road Graph Info Banner */}
      <div className="bg-navy-800/80 border border-slate-border/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-teal-accent shrink-0" />
          <span>
            Active Graph:{' '}
            <strong className="text-white">
              {activePredefinedArea
                ? activePredefinedArea.name
                : activeGraph
                ? activeGraph.sourceName
                : 'Custom Location (Queries live OSM Overpass on Compare)'}
            </strong>
          </span>
        </div>
        {activeGraph && (
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span>
              <strong className="text-cyan-accent">{activeGraph.nodeCount}</strong> Road Intersections
            </span>
            <span>•</span>
            <span>
              <strong className="text-teal-accent">{activeGraph.edgeCount}</strong> Connected Edges (One-ways modeled)
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Controls + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Routing Controls & Comparison Launch (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Search & Setup Card */}
          <div className="bg-navy-800 border border-slate-border rounded-xl p-4 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Compass size={15} className="text-cyan-accent" />
                Endpoints & Snapping
              </h2>
              {selectedAreaId !== 'custom' && (
                <span className="text-[10px] text-cyan-accent bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Pre-extracted OSM
                </span>
              )}
            </div>

            {/* Inputs & Swap */}
            <div className="space-y-2.5">
              <LocationSearchInput
                id="search-start-point"
                label="Start Location"
                point={startPoint}
                onSelectPoint={(p) => setStartPoint(p)}
                accent="green"
                placeholder={
                  activePredefinedArea
                    ? `Default: ${activePredefinedArea.defaultStartId}`
                    : 'Search city, address, landmark...'
                }
              />

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  id="swap-locations-btn"
                  onClick={handleSwap}
                  disabled={!startPoint && !endPoint}
                  title="Swap Start and Destination"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-navy-900 border border-slate-border text-gray-300 hover:text-cyan-accent hover:border-cyan-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowUpDown size={12} />
                  <span>Swap Start / Destination</span>
                </button>
              </div>

              <LocationSearchInput
                id="search-end-point"
                label="Destination"
                point={endPoint}
                onSelectPoint={(p) => setEndPoint(p)}
                accent="pink"
                placeholder={
                  activePredefinedArea
                    ? `Default: ${activePredefinedArea.defaultDestId}`
                    : 'Search city, address, landmark...'
                }
              />
            </div>

            {/* PROMINENT ACTION BUTTON: COMPARE ALGORITHMS */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="compare-algorithms-btn"
                onClick={() => handleRunComparison()}
                disabled={!startPoint || !endPoint || isComparing}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-accent via-teal-accent to-emerald-400 hover:opacity-95 active:scale-[0.99] text-navy-900 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isComparing ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-navy-900" />
                    <span>{statusMessage || 'Evaluating Graph Algorithms…'}</span>
                  </>
                ) : (
                  <>
                    <GitBranch size={16} />
                    <span>Compare All 5 Algorithms</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="calculate-osrm-btn"
                onClick={() => {
                  if (startPoint && endPoint) {
                    fetchOSRMReference(startPoint, endPoint);
                    setVisibleAlgorithms((prev) => ({ ...prev, OSRM: true }));
                  }
                }}
                disabled={!startPoint || !endPoint || loadingOSRM}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-navy-900 hover:bg-slate-700/60 border border-slate-border text-gray-300 hover:text-white text-[11px] rounded-lg transition-colors"
              >
                <Car size={13} className="text-slate-400" />
                <span>Fetch External OSRM Driving Reference</span>
              </button>
            </div>

            {/* Map Click Selection Mode Toolbar */}
            <div className="pt-2 border-t border-slate-border/50">
              <div className="text-[11px] font-medium text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Direct Map Click Selection:</span>
                <span className="text-[10px] text-gray-500">Click map to set points</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  id="mode-set-start-btn"
                  onClick={() => setClickMode('start')}
                  className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 border transition-colors ${
                    clickMode === 'start'
                      ? 'bg-green-500/20 border-green-500/60 text-green-300 font-medium'
                      : 'bg-navy-900 border-slate-border text-gray-400 hover:text-white'
                  }`}
                >
                  <MapPin size={11} className="text-green-400" />
                  <span>Set Start</span>
                </button>
                <button
                  type="button"
                  id="mode-set-end-btn"
                  onClick={() => setClickMode('end')}
                  className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 border transition-colors ${
                    clickMode === 'end'
                      ? 'bg-pink-500/20 border-pink-500/60 text-pink-300 font-medium'
                      : 'bg-navy-900 border-slate-border text-gray-400 hover:text-white'
                  }`}
                >
                  <MapPin size={11} className="text-pink-400" />
                  <span>Set Dest</span>
                </button>
                <button
                  type="button"
                  id="mode-pan-only-btn"
                  onClick={() => setClickMode('none')}
                  className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 border transition-colors ${
                    clickMode === 'none'
                      ? 'bg-slate-700/60 border-slate-500 text-white font-medium'
                      : 'bg-navy-900 border-slate-border text-gray-400 hover:text-white'
                  }`}
                >
                  <span>Pan Map</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-red-300">Notice: </span>
                <span className="text-red-300/80">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Interactive Route Layer Legend & Toggles */}
          {algorithmResults && (
            <div className="bg-navy-800 border border-slate-border rounded-xl p-3.5 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-border/50">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Layers size={13} className="text-cyan-accent" />
                  Route Layers & Visibility
                </span>
                <span className="text-[10px] text-gray-400">Click to toggle / highlight</span>
              </div>

              <div className="space-y-1.5">
                {ALL_ALGO_KEYS.map((algo) => {
                  const res = algorithmResults[algo];
                  const cfg = ALGO_COLORS[algo];
                  const isVis = visibleAlgorithms[algo];
                  const isSel = selectedAlgorithm === algo;

                  return (
                    <div
                      key={algo}
                      onClick={() => setSelectedAlgorithm(isSel ? null : algo)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSel
                          ? `${cfg.bg} ${cfg.border} ring-1 ring-cyan-500/40`
                          : 'bg-navy-900/70 border-slate-border/60 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border"
                          style={{
                            backgroundColor: cfg.color,
                            borderColor: isSel ? '#ffffff' : cfg.color,
                          }}
                        />
                        <div className="min-w-0">
                          <span className={`font-semibold ${cfg.text}`}>{algo}</span>
                          {res.pathFound ? (
                            <span className="text-[11px] text-gray-400 ml-2">
                              {formatDistance(res.pathDistanceMeters)} ({res.edgeCount} edges)
                            </span>
                          ) : (
                            <span className="text-[11px] text-red-400 ml-2">No path</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(algo);
                        }}
                        className="p-1 text-gray-400 hover:text-white rounded"
                        title={isVis ? 'Hide on map' : 'Show on map'}
                      >
                        {isVis ? <Eye size={13} className="text-cyan-accent" /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  );
                })}

                {/* OSRM External Reference Layer */}
                {osrmRoute && (
                  <div
                    onClick={() => setSelectedAlgorithm(selectedAlgorithm === 'OSRM' ? null : 'OSRM')}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedAlgorithm === 'OSRM'
                        ? 'bg-slate-700/40 border-slate-500 ring-1 ring-slate-400'
                        : 'bg-navy-900/70 border-slate-border/60 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-300">OSRM Reference</span>
                        <span className="text-[11px] text-gray-400 ml-2">
                          {formatDistance(osrmRoute.distance)} ({formatDuration(osrmRoute.duration)})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility('OSRM');
                      }}
                      className="p-1 text-gray-400 hover:text-white rounded"
                    >
                      {visibleAlgorithms.OSRM ? (
                        <Eye size={13} className="text-cyan-accent" />
                      ) : (
                        <EyeOff size={13} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Leaflet Map Container (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div
            id="leaflet-map-wrapper"
            className="w-full bg-navy-800 border border-slate-border rounded-xl overflow-hidden relative shadow-xl"
            style={{ minHeight: '560px', height: '100%' }}
          >
            <MapContainer
              center={
                activeGraph
                  ? [
                      (activeGraph.bounds.minLat + activeGraph.bounds.maxLat) / 2,
                      (activeGraph.bounds.minLng + activeGraph.bounds.maxLng) / 2,
                    ]
                  : [51.5074, -0.1278]
              }
              zoom={13}
              style={{ width: '100%', height: '100%', minHeight: '560px' }}
              className="z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {/* Automatic Bounds & Resize Controller */}
              <MapBoundsController
                algorithmResults={algorithmResults}
                visibleAlgorithms={visibleAlgorithms}
                osrmRoute={osrmRoute}
                startPoint={startPoint}
                endPoint={endPoint}
                fitTrigger={fitTrigger}
              />

              {/* User Click Handler */}
              <MapClickHandler clickMode={clickMode} onMapClick={handleMapClick} />

              {/* Start Location Marker */}
              {startPoint && (
                <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold text-green-400 flex items-center gap-1">
                        <MapPin size={12} /> Start Location
                      </div>
                      <div className="text-white font-medium mt-0.5">{startPoint.name}</div>
                      {snappedStart && (
                        <div className="text-[10px] text-teal-accent mt-1">
                          Snapped to Road Node: {snappedStart.node.name || snappedStart.nodeId} (
                          {Math.round(snappedStart.distanceToOriginalMeters)}m)
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination Marker */}
              {endPoint && (
                <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold text-pink-400 flex items-center gap-1">
                        <MapPin size={12} /> Destination
                      </div>
                      <div className="text-white font-medium mt-0.5">{endPoint.name}</div>
                      {snappedDest && (
                        <div className="text-[10px] text-teal-accent mt-1">
                          Snapped to Road Node: {snappedDest.node.name || snappedDest.nodeId} (
                          {Math.round(snappedDest.distanceToOriginalMeters)}m)
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* RENDER ACTUAL COMPUTED ROAD-NETWORK PATHS FOR EACH ALGORITHM */}
              {algorithmResults &&
                ALL_ALGO_KEYS.map((algo) => {
                  const res = algorithmResults[algo];
                  if (!visibleAlgorithms[algo] || !res.pathFound || res.pathCoordinates.length < 2) {
                    return null;
                  }

                  const isSelected = selectedAlgorithm === algo;
                  const cfg = ALGO_COLORS[algo];

                  return (
                    <Polyline
                      key={`route-${algo}`}
                      positions={res.pathCoordinates}
                      pathOptions={{
                        color: cfg.color,
                        weight: isSelected ? 6.5 : 4,
                        opacity: isSelected ? 1.0 : selectedAlgorithm ? 0.35 : 0.75,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  );
                })}

              {/* Render OSRM Reference route if enabled */}
              {visibleAlgorithms.OSRM && osrmRoute && (
                <Polyline
                  positions={osrmRoute.coordinates}
                  pathOptions={{
                    color: '#94a3b8',
                    weight: selectedAlgorithm === 'OSRM' ? 5 : 3,
                    opacity: selectedAlgorithm === 'OSRM' ? 1.0 : 0.6,
                    dashArray: '8, 8',
                  }}
                />
              )}
            </MapContainer>

            {/* In-Map Click Status Badge */}
            {clickMode !== 'none' && (
              <div className="absolute top-3 right-3 z-10 bg-navy-900/90 backdrop-blur border border-slate-border text-gray-300 text-[11px] px-2.5 py-1.5 rounded-lg shadow-md pointer-events-none flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    clickMode === 'start' ? 'bg-green-400' : 'bg-pink-400'
                  }`}
                />
                <span>
                  {clickMode === 'start' ? 'Click map to place Start' : 'Click map to place Destination'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPARISON RESULTS SECTION */}
      {algorithmResults && (
        <div className="space-y-4 pt-2">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-border pb-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="text-cyan-accent" size={20} />
                Algorithm Comparison on Road Network
              </h2>
              <span className="text-xs text-gray-400">
                Evaluated on identical graph snapshot ({activeGraph?.nodeCount} nodes, {activeGraph?.edgeCount} edges)
              </span>
            </div>
            <button
              id="export-map-csv-btn"
              onClick={handleExportMapCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-slate-700 text-gray-200 border border-slate-border rounded-lg text-xs font-medium transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
              title="Export algorithm comparison data to CSV"
            >
              <Download size={14} className="text-cyan-accent" />
              Export CSV
            </button>
          </div>

          {/* Results Table */}
          <div className="bg-navy-800 border border-slate-border rounded-xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-900 border-b border-slate-border text-gray-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Algorithm</th>
                  <th className="py-3 px-3">Path Found</th>
                  <th className="py-3 px-3">Execution Time</th>
                  <th className="py-3 px-3">Nodes Expanded</th>
                  <th className="py-3 px-3">Path Distance</th>
                  <th className="py-3 px-3">Edge Count</th>
                  <th className="py-3 px-4">Optimality & Theoretical Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border/50">
                {ALL_ALGO_KEYS.map((algo) => {
                  const res = algorithmResults[algo];
                  const cfg = ALGO_COLORS[algo];
                  const isSelected = selectedAlgorithm === algo;

                  return (
                    <tr
                      key={algo}
                      onClick={() => setSelectedAlgorithm(isSelected ? null : algo)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? `${cfg.bg} font-medium`
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className={cfg.text}>{algo}</span>
                      </td>

                      <td className="py-3 px-3">
                        {res.pathFound ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} /> Yes
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1">
                            <X size={13} /> No
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-gray-200">
                        {res.executionTimeMs < 0.05
                          ? '< 0.05 ms'
                          : `${res.executionTimeMs.toFixed(2)} ms`}
                      </td>

                      <td className="py-3 px-3 font-mono text-cyan-accent">
                        {res.nodesExpanded.toLocaleString()}
                        <span className="text-[10px] text-gray-500 ml-1">
                          / {res.nodesDiscovered} seen
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-white font-semibold">
                        {res.pathFound ? formatDistance(res.pathDistanceMeters) : '—'}
                      </td>

                      <td className="py-3 px-3 font-mono text-gray-300">
                        {res.pathFound ? `${res.edgeCount} edges` : '—'}
                      </td>

                      <td className="py-3 px-4 text-[11px] text-gray-300 max-w-xs">
                        {res.optimalityNote}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Performance Charts (Recharts) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Chart 1: Execution Time */}
            <div className="bg-navy-800 border border-slate-border rounded-xl p-4 shadow-lg">
              <h3 className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                <Activity size={14} className="text-cyan-accent" /> Computation Time (ms)
              </h3>
              <p className="text-[10px] text-gray-400 mb-3">Measured with performance.now()</p>
              <div style={{ height: '190px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px' }}
                      formatter={(val) => [`${val} ms`, 'Time']}
                    />
                    <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-time-${entry.name}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Nodes Expanded */}
            <div className="bg-navy-800 border border-slate-border rounded-xl p-4 shadow-lg">
              <h3 className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                <GitBranch size={14} className="text-emerald-400" /> Nodes Expanded (Search Space)
              </h3>
              <p className="text-[10px] text-gray-400 mb-3">Lower is more targeted exploration</p>
              <div style={{ height: '190px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px' }}
                      formatter={(val) => [`${val} nodes`, 'Expanded']}
                    />
                    <Bar dataKey="nodesExpanded" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-nodes-${entry.name}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Path Distance */}
            <div className="bg-navy-800 border border-slate-border rounded-xl p-4 shadow-lg">
              <h3 className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                <TrendingDown size={14} className="text-cyan-accent" /> Path Distance (km)
              </h3>
              <p className="text-[10px] text-gray-400 mb-3">Dijkstra & A* achieve minimal cost</p>
              <div style={{ height: '190px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px' }}
                      formatter={(val) => [val != null ? `${val} km` : 'No path', 'Distance']}
                    />
                    <Bar dataKey="distanceKm" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-dist-${entry.name}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Academic In-Depth Analysis Card */}
          <div className="bg-navy-800 border border-slate-border rounded-xl p-4 space-y-2.5 shadow-lg">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Info size={15} className="text-cyan-accent" />
              Academic AOA Analysis — Why the Algorithms Diverge on Road Networks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300 leading-relaxed">
              <div className="space-y-1.5 bg-navy-900/60 p-3 rounded-lg border border-slate-border/50">
                <p>
                  <strong className="text-cyan-400">Dijkstra vs. A* Optimality & Expansion:</strong> Both Dijkstra
                  and A* find the <em>provably optimal least-cost route</em> because all road segment lengths are
                  non-negative ($w \ge 0$) and the Haversine heuristic $h(n)$ is strictly admissible ($h(n) \le
                  h^*(n)$) and monotonic. However, A* expands far fewer intersections by penalizing routes moving
                  away from the destination.
                </p>
                <p>
                  <strong className="text-blue-400">BFS Minimizes Hops, Not Distance:</strong> BFS treats every road
                  edge with equal unit cost. Consequently, it selects the path with the fewest turns or intersections,
                  even if that route spans a longer highway or bypass compared to a shorter sequence of residential
                  streets.
                </p>
              </div>

              <div className="space-y-1.5 bg-navy-900/60 p-3 rounded-lg border border-slate-border/50">
                <p>
                  <strong className="text-amber-400">Greedy Best-First Trade-Off:</strong> Greedy prioritizes nodes
                  purely by straight-line distance ($f = h$). It surges straight toward the goal without accounting
                  for accumulated distance ($g$). When cul-de-sacs, one-way streets, or rivers intervene, it frequently
                  takes substantial sub-optimal detours.
                </p>
                <p>
                  <strong className="text-pink-400">DFS Path Pathology:</strong> DFS dives deep into the first
                  unvisited road branch until hitting a dead end or the destination, producing highly irregular,
                  meandering routes. It is useful for topological existence proofs, but never for road navigation.
                </p>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 pt-1 border-t border-slate-border/40">
              * Note: Benchmark measurements represent executions on the downloaded/extracted OSM road graph topology.
              Road edge costs are Euclidean/spherical Haversine distances along road ways.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
