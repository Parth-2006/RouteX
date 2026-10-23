import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Play,

  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  MapPin,
  Flag,
  ArrowLeftRight,
  Sliders,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
  Layers,
  Sparkles,
  Compass,
  Eye,
  EyeOff,
  Activity,
  GitBranch,
  RefreshCw,
  X,
  Target,
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

import {
  GraphAlgorithmName,
  GraphAlgorithmResult,
  runAllGraphAlgorithms,
  CENTRAL_LONDON_ROAD_GRAPH,
  MANHATTAN_ROAD_GRAPH,
  SOUTH_MUMBAI_ROAD_GRAPH,
} from '../algorithms/graph';

import {
  SyntheticCity,
  generateSyntheticCity,
  DEFAULT_SYNTHETIC_CITY,
  roadGraphToSyntheticCity,
} from '../algorithms/graph/syntheticCityGenerator';

import {
  buildGraphSearchTrace,
  SearchTrace,
} from '../algorithms/graph/searchTracer';

import {
  CityMapVisualizer,
  SelectionMode,
} from '../components/map/CityMapVisualizer';
import { ALGORITHM_PALETTE } from '../components/map/mapPalette';


const ALL_ALGORITHMS: GraphAlgorithmName[] = ['Dijkstra', 'A*', 'BFS', 'Greedy', 'DFS'];

interface PredefinedScenarioOption {
  id: string;
  name: string;
  category: 'Synthetic Metropolis' | 'Real-World OSM Extract';
  cityFactory: () => SyntheticCity;
  defaultStartId: string;
  defaultDestId: string;
  description: string;
}

export function MapDemo() {
  // 1. City & Graph State
  const [currentSeed, setCurrentSeed] = useState<number>(42);
  const [city, setCity] = useState<SyntheticCity>(() => DEFAULT_SYNTHETIC_CITY);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scenario-downtown-cross-river');

  // 2. Interactive Endpoint Selection
  const [startNodeId, setStartNodeId] = useState<string>('w-civic-center');
  const [destNodeId, setDestNodeId] = useState<string>('e-central-tower');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');

  // 3. Algorithm Selection & Modes
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<GraphAlgorithmName>('A*');
  const [activeTab, setActiveTab] = useState<'comparison' | 'charts' | 'insights'>('comparison');

  // 4. Animation & Playback State
  const [speedMs, setSpeedMs] = useState<number>(35);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [trace, setTrace] = useState<SearchTrace | null>(() =>
    buildGraphSearchTrace('A*', DEFAULT_SYNTHETIC_CITY.graph, 'w-civic-center', 'e-central-tower')
  );
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(() => {
    const initialTrace = buildGraphSearchTrace('A*', DEFAULT_SYNTHETIC_CITY.graph, 'w-civic-center', 'e-central-tower');
    return initialTrace.frames.length - 1;
  });

  // 5. Comparison Results & Route Toggles
  const [comparisonResults, setComparisonResults] = useState<Record<GraphAlgorithmName, GraphAlgorithmResult> | null>(() =>
    runAllGraphAlgorithms(DEFAULT_SYNTHETIC_CITY.graph, 'w-civic-center', 'e-central-tower')
  );
  const [routeVisibility, setRouteVisibility] = useState<Record<GraphAlgorithmName, boolean>>({
    Dijkstra: true,
    'A*': true,
    BFS: true,
    Greedy: true,
    DFS: true,
  });
  const [highlightedAlgorithm, setHighlightedAlgorithm] = useState<GraphAlgorithmName | null>(null);

  // Refs for animation loop
  const animTimeoutRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const traceRef = useRef<SearchTrace | null>(trace);
  const frameIndexRef = useRef<number>(currentFrameIndex);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    traceRef.current = trace;
  }, [trace]);

  // List of all scenarios (Synthetic + Bundled extracts)
  const scenariosList = useMemo<PredefinedScenarioOption[]>(() => {
    const syntheticScenarios = DEFAULT_SYNTHETIC_CITY.scenarios.map((sc) => ({
      id: sc.id,
      name: sc.name,
      category: 'Synthetic Metropolis' as const,
      cityFactory: () => (currentSeed === 42 ? DEFAULT_SYNTHETIC_CITY : generateSyntheticCity(currentSeed)),
      defaultStartId: sc.startNodeId,
      defaultDestId: sc.destNodeId,
      description: sc.description,
    }));

    const bundledExtracts: PredefinedScenarioOption[] = [
      {
        id: 'extract-london',
        name: 'Central London (OSM Extract)',
        category: 'Real-World OSM Extract',
        cityFactory: () =>
          roadGraphToSyntheticCity(
            CENTRAL_LONDON_ROAD_GRAPH,
            'Central London Road Network',
            'lon-hyde-park-corner',
            'lon-bank',
            'Authentic London road network with Piccadilly, Westminster, and the City of London.'
          ),
        defaultStartId: 'lon-hyde-park-corner',
        defaultDestId: 'lon-bank',
        description: 'Piccadilly, Westminster, Fleet St, and Bank with verified road curvature.',
      },
      {
        id: 'extract-manhattan',
        name: 'Manhattan Midtown & Broadway',
        category: 'Real-World OSM Extract',
        cityFactory: () =>
          roadGraphToSyntheticCity(
            MANHATTAN_ROAD_GRAPH,
            'Manhattan Road Network',
            'nyc-battery-park',
            'nyc-columbus-circle',
            'Manhattan grid with diagonal Broadway, alternating one-way avenues and crosstown streets.'
          ),
        defaultStartId: 'nyc-battery-park',
        defaultDestId: 'nyc-columbus-circle',
        description: 'Manhattan grid with diagonal Broadway and one-way avenue corridors.',
      },
      {
        id: 'extract-mumbai',
        name: 'Mumbai Metropolitan & Coast',
        category: 'Real-World OSM Extract',
        cityFactory: () =>
          roadGraphToSyntheticCity(
            SOUTH_MUMBAI_ROAD_GRAPH,
            'Mumbai Road Network',
            'mum-gamdevi',
            'mum-crawford-market',
            'D Ward, Princess Street, Kalbadevi, Crawford Market, and Marine Drive.'
          ),
        defaultStartId: 'mum-gamdevi',
        defaultDestId: 'mum-crawford-market',
        description: 'South Mumbai arterial streets, coastal promenade, and commercial junctions.',
      },
    ];

    return [...syntheticScenarios, ...bundledExtracts];
  }, [currentSeed]);

  // Clear animation cleanly
  const stopAnimation = useCallback(() => {
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
    setIsAnimating(false);
    setIsPaused(false);
  }, []);

  // Recalculate benchmarks and update routes immediately
  const runBenchmarks = useCallback(
    (g: SyntheticCity['graph'], sId: string, dId: string, algo: GraphAlgorithmName) => {
      stopAnimation();
      const results = runAllGraphAlgorithms(g, sId, dId);
      setComparisonResults(results);
      const searchTrace = buildGraphSearchTrace(algo, g, sId, dId);
      setTrace(searchTrace);
      traceRef.current = searchTrace;
      frameIndexRef.current = searchTrace.frames.length - 1;
      setCurrentFrameIndex(searchTrace.frames.length - 1);
    },
    [stopAnimation]
  );

  // Run Compare All (Instant benchmark on all 5 algorithms)
  const handleCompareAll = useCallback(() => {
    runBenchmarks(city.graph, startNodeId, destNodeId, selectedAlgorithm);
  }, [city.graph, startNodeId, destNodeId, selectedAlgorithm, runBenchmarks]);

  // Animation step loop with stable ref
  const scheduleNextFrameRef = useRef<() => void>(() => {});
  useEffect(() => {
    scheduleNextFrameRef.current = () => {
      if (!isAnimating || isPausedRef.current) return;

      const currentTrace = traceRef.current;
      if (!currentTrace) return;

      if (frameIndexRef.current < currentTrace.frames.length - 1) {
        frameIndexRef.current++;
        setCurrentFrameIndex(frameIndexRef.current);

        animTimeoutRef.current = window.setTimeout(() => {
          scheduleNextFrameRef.current();
        }, speedMs);
      } else {
        setIsAnimating(false);
      }
    };
  });

  useEffect(() => {
    if (isAnimating && !isPaused) {
      scheduleNextFrameRef.current();
    }
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, [isAnimating, isPaused, speedMs]);

  // Start Search Animation
  const handleRunAlgorithm = useCallback(() => {
    stopAnimation();
    const searchTrace = buildGraphSearchTrace(selectedAlgorithm, city.graph, startNodeId, destNodeId);
    setTrace(searchTrace);
    traceRef.current = searchTrace;
    frameIndexRef.current = 0;
    setCurrentFrameIndex(0);
    setIsAnimating(true);
    setIsPaused(false);
  }, [selectedAlgorithm, city.graph, startNodeId, destNodeId, stopAnimation]);

  // Pause / Resume
  const handleTogglePause = useCallback(() => {
    if (!isAnimating) {
      if (trace && currentFrameIndex < trace.frames.length - 1) {
        setIsAnimating(true);
        setIsPaused(false);
      } else {
        handleRunAlgorithm();
      }
      return;
    }
    setIsPaused((p) => !p);
  }, [isAnimating, trace, currentFrameIndex, handleRunAlgorithm]);

  // Step Forward
  const handleStepForward = useCallback(() => {
    if (!trace) {
      const searchTrace = buildGraphSearchTrace(selectedAlgorithm, city.graph, startNodeId, destNodeId);
      setTrace(searchTrace);
      traceRef.current = searchTrace;
      frameIndexRef.current = 0;
      setCurrentFrameIndex(0);
      setIsAnimating(false);
      setIsPaused(true);
      return;
    }

    if (frameIndexRef.current < trace.frames.length - 1) {
      frameIndexRef.current++;
      setCurrentFrameIndex(frameIndexRef.current);
      setIsPaused(true);
      setIsAnimating(false);
    }
  }, [trace, selectedAlgorithm, city.graph, startNodeId, destNodeId]);

  // Reset Visualization
  const handleResetSearch = useCallback(() => {
    runBenchmarks(city.graph, startNodeId, destNodeId, selectedAlgorithm);
  }, [city.graph, startNodeId, destNodeId, selectedAlgorithm, runBenchmarks]);

  // Endpoint Change Handlers
  const handleSelectStart = useCallback(
    (newStartId: string) => {
      if (newStartId === startNodeId) return;
      setStartNodeId(newStartId);
      runBenchmarks(city.graph, newStartId, destNodeId, selectedAlgorithm);
    },
    [startNodeId, destNodeId, city.graph, selectedAlgorithm, runBenchmarks]
  );

  const handleSelectDest = useCallback(
    (newDestId: string) => {
      if (newDestId === destNodeId) return;
      setDestNodeId(newDestId);
      runBenchmarks(city.graph, startNodeId, newDestId, selectedAlgorithm);
    },
    [destNodeId, startNodeId, city.graph, selectedAlgorithm, runBenchmarks]
  );

  const handleSwapEndpoints = useCallback(() => {
    const oldStart = startNodeId;
    const oldDest = destNodeId;
    setStartNodeId(oldDest);
    setDestNodeId(oldStart);
    runBenchmarks(city.graph, oldDest, oldStart, selectedAlgorithm);
  }, [startNodeId, destNodeId, city.graph, selectedAlgorithm, runBenchmarks]);

  const handleResetToDefaultScenario = useCallback(() => {
    const sc = scenariosList.find((s) => s.id === selectedScenarioId) || scenariosList[0];
    setStartNodeId(sc.defaultStartId);
    setDestNodeId(sc.defaultDestId);
    runBenchmarks(city.graph, sc.defaultStartId, sc.defaultDestId, selectedAlgorithm);
  }, [selectedScenarioId, scenariosList, city.graph, selectedAlgorithm, runBenchmarks]);

  // Scenario Change Handler
  const handleSelectScenario = useCallback(
    (scenarioId: string) => {
      const sc = scenariosList.find((s) => s.id === scenarioId);
      if (!sc) return;

      setSelectedScenarioId(scenarioId);
      const newCity = sc.cityFactory();
      setCity(newCity);

      // Check if current endpoints are valid in new city; otherwise use scenario defaults
      const startValid = newCity.graph.nodes.has(startNodeId);
      const destValid = newCity.graph.nodes.has(destNodeId);

      const nextStart = startValid ? startNodeId : sc.defaultStartId;
      const nextDest = destValid ? destNodeId : sc.defaultDestId;

      setStartNodeId(nextStart);
      setDestNodeId(nextDest);
      runBenchmarks(newCity.graph, nextStart, nextDest, selectedAlgorithm);
    },
    [scenariosList, startNodeId, destNodeId, selectedAlgorithm, runBenchmarks]
  );

  // Regenerate City Layout with Seed
  const handleRegenerateCity = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 9000) + 1000;
    setCurrentSeed(newSeed);
    const newCity = generateSyntheticCity(newSeed);
    setCity(newCity);

    // Keep endpoints if valid, otherwise pick defaults
    const nodes = Array.from(newCity.graph.nodes.keys());
    const newStart = newCity.graph.nodes.has(startNodeId) ? startNodeId : nodes[0] || 'w-civic-center';
    const newDest = newCity.graph.nodes.has(destNodeId) ? destNodeId : nodes[nodes.length - 1] || 'e-central-tower';

    setStartNodeId(newStart);
    setDestNodeId(newDest);
    runBenchmarks(newCity.graph, newStart, newDest, selectedAlgorithm);
  }, [startNodeId, destNodeId, selectedAlgorithm, runBenchmarks]);


  // Route Visibility Toggles
  const handleToggleRouteVisibility = useCallback((algo: GraphAlgorithmName) => {
    setRouteVisibility((prev) => ({
      ...prev,
      [algo]: !prev[algo],
    }));
  }, []);

  const handleToggleAllRoutes = useCallback((enable: boolean) => {
    setRouteVisibility({
      Dijkstra: enable,
      'A*': enable,
      BFS: enable,
      Greedy: enable,
      DFS: enable,
    });
  }, []);

  // Export results to CSV
  const handleExportCSV = useCallback(() => {
    if (!comparisonResults) return;
    const rows = [
      ['Algorithm', 'Path Found', 'Execution Time (ms)', 'Nodes Expanded', 'Nodes Discovered', 'Path Distance (m)', 'Edge Count', 'Optimality Note'],
      ...ALL_ALGORITHMS.map((algo) => {
        const r = comparisonResults[algo];
        return [
          algo,
          r ? (r.pathFound ? 'YES' : 'NO') : 'N/A',
          r ? r.executionTimeMs.toFixed(2) : '',
          r ? r.nodesExpanded : '',
          r ? r.nodesDiscovered : '',
          r ? r.pathDistanceMeters : '',
          r ? r.edgeCount : '',
          r ? `"${r.optimalityNote.replace(/"/g, '""')}"` : '',
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `routex-comparison-seed-${city.seed}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [comparisonResults, city.seed]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (!comparisonResults) return [];
    return ALL_ALGORITHMS.map((algo) => {
      const res = comparisonResults[algo];
      return {
        algorithm: algo,
        timeMs: res ? Number(res.executionTimeMs.toFixed(2)) : 0,
        expanded: res ? res.nodesExpanded : 0,
        discovered: res ? res.nodesDiscovered : 0,
        distanceM: res ? res.pathDistanceMeters : 0,
        edges: res ? res.edgeCount : 0,
        pathFound: res ? res.pathFound : false,
      };
    });
  }, [comparisonResults]);

  // Current frame for visualization
  const currentFrame = trace ? trace.frames[currentFrameIndex] : null;

  const isSameEndpoint = startNodeId === destNodeId;

  // Sort intersections for clean dropdown options
  const sortedIntersections = useMemo(() => {
    return [...city.intersections].sort((a, b) => a.name.localeCompare(b.name));
  }, [city.intersections]);

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Page Header & Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Compass size={22} />
              </span>
              <span>City Road Network Visualizer</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
              100% Offline
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Simulate and benchmark BFS, DFS, Dijkstra, A*, and Greedy on realistic city topologies with dense road curvature.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-new-city"
            onClick={handleRegenerateCity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-gray-200 border border-slate-700 text-xs font-medium transition-colors"
            title="Generate a new reproducible road network"
          >
            <RefreshCw size={14} className="text-cyan-400" />
            <span>New City Layout</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-gray-200 border border-slate-700 text-xs font-medium transition-colors"
            title="Export benchmark metrics to CSV"
          >
            <Download size={14} className="text-gray-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Interactive Control Bar */}
      <div className="p-4 rounded-xl bg-navy-950/80 border border-slate-800 shadow-xl space-y-4">
        {/* Row 1: Scenarios & Layout Selector */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="scenario-select" className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <Layers size={14} className="text-cyan-400" />
                <span>Scenario:</span>
              </label>
              <select
                id="scenario-select"
                aria-label="Select Scenario"
                value={selectedScenarioId}
                onChange={(e) => handleSelectScenario(e.target.value)}
                className="bg-navy-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
              >
                <optgroup label="Synthetic Metropolis Scenarios">
                  {scenariosList
                    .filter((s) => s.category === 'Synthetic Metropolis')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Authentic OSM Road Extracts">
                  {scenariosList
                    .filter((s) => s.category === 'Real-World OSM Extract')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="text-xs text-gray-400 hidden xl:inline border-l border-slate-800 pl-3">
              {scenariosList.find((s) => s.id === selectedScenarioId)?.description}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            <span className="text-xs font-mono text-gray-400">
              Seed: <span className="text-cyan-400 font-bold">{city.seed}</span>
            </span>
            <button
              id="btn-reset-points"
              onClick={handleResetToDefaultScenario}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-700 transition-colors"
            >
              Reset Points
            </button>
          </div>
        </div>

        {/* Row 2: User-Controlled Start and Destination Point Selection */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-800/80 items-center">
          {/* Start Point Controls */}
          <div className="md:col-span-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Flag size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Start Intersection
                </span>
                <button
                  id="btn-pick-start"
                  onClick={() => setSelectionMode(selectionMode === 'start' ? 'none' : 'start')}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                    selectionMode === 'start'
                      ? 'bg-emerald-500 text-navy-950 font-bold'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                  }`}
                  title="Click to pick start node on the map"
                >
                  <MapPin size={11} />
                  <span>{selectionMode === 'start' ? 'Cancel Pick' : 'Pick on Map'}</span>
                </button>
              </div>
              <select
                id="select-start-node"
                aria-label="Select Start Intersection"
                value={startNodeId}
                onChange={(e) => handleSelectStart(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 truncate"
              >
                {sortedIntersections.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} ({node.district})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-2 flex justify-center py-1 md:py-0">
            <button
              id="btn-swap-endpoints"
              onClick={handleSwapEndpoints}
              className="p-2 rounded-lg bg-navy-800 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 shadow"
              title="Swap Start and Destination"
            >
              <ArrowLeftRight size={16} />
              <span className="text-xs font-medium md:hidden">Swap Endpoints</span>
            </button>
          </div>

          {/* Destination Point Controls */}
          <div className="md:col-span-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
              <Target size={16} className="text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
                  Destination
                </span>
                <button
                  id="btn-pick-dest"
                  onClick={() => setSelectionMode(selectionMode === 'dest' ? 'none' : 'dest')}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 ${
                    selectionMode === 'dest'
                      ? 'bg-pink-500 text-navy-950 font-bold'
                      : 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 border border-pink-500/40'
                  }`}
                  title="Click to pick destination node on the map"
                >
                  <MapPin size={11} />
                  <span>{selectionMode === 'dest' ? 'Cancel Pick' : 'Pick on Map'}</span>
                </button>
              </div>
              <select
                id="select-dest-node"
                aria-label="Select Destination Intersection"
                value={destNodeId}
                onChange={(e) => handleSelectDest(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-pink-500 truncate"
              >
                {sortedIntersections.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} ({node.district})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Warning if start and destination are identical */}
        {isSameEndpoint && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <span>
              Start and destination points are identical. Road distance is 0m across 0 edges. Select distinct endpoints to simulate road routing.
            </span>
          </div>
        )}
      </div>

      {/* 3. Search & Playback Bar */}
      <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Algorithm Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ALL_ALGORITHMS.map((algo) => {
            const isSelected = selectedAlgorithm === algo;
            const palette = ALGORITHM_PALETTE[algo];
            return (
              <button
                key={algo}
                onClick={() => {
                  setSelectedAlgorithm(algo);
                  setHighlightedAlgorithm(algo);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? `${palette.bg} ${palette.text} ${palette.border} shadow-lg ring-1 ring-cyan-500/30`
                    : 'bg-navy-900/60 text-gray-400 border-slate-800 hover:text-white hover:bg-navy-800'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: palette.stroke }}
                />
                <span>{algo}</span>
              </button>
            );
          })}
        </div>

        {/* Playback & Step Controls */}
        <div className="flex items-center gap-2">
          {/* Run Single Search Animation */}
          <button
            id="btn-animate-algo"
            onClick={handleRunAlgorithm}
            disabled={isAnimating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-navy-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            title="Animate single algorithm step-by-step"
          >
            <Play size={14} fill="currentColor" />
            <span>Animate {selectedAlgorithm}</span>
          </button>

          {/* Pause / Resume */}
          <button
            id="btn-toggle-pause"
            onClick={handleTogglePause}
            className={`p-1.5 rounded-lg border transition-colors ${
              isAnimating && !isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-navy-800 text-gray-300 border-slate-700 hover:text-white hover:bg-navy-700'
            }`}
            title={isPaused ? 'Resume Animation' : 'Pause Animation'}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>

          {/* Step Forward */}
          <button
            id="btn-step-forward"
            onClick={handleStepForward}
            className="p-1.5 rounded-lg bg-navy-800 text-gray-300 border border-slate-700 hover:text-white hover:bg-navy-700 transition-colors"
            title="Step forward 1 expansion"
          >
            <SkipForward size={15} />
          </button>

          {/* Reset */}
          <button
            id="btn-reset-search"
            onClick={handleResetSearch}
            className="p-1.5 rounded-lg bg-navy-800 text-gray-300 border border-slate-700 hover:text-white hover:bg-navy-700 transition-colors"
            title="Reset Search Visualization"
          >
            <RotateCcw size={15} />
          </button>

          {/* Animation Speed Slider */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
            <Sliders size={13} className="text-gray-400" />
            <input
              id="slider-speed"
              type="range"
              min="5"
              max="150"
              step="5"
              value={speedMs}
              onChange={(e) => setSpeedMs(Number(e.target.value))}
              className="w-16 accent-cyan-400 cursor-pointer"
              title={`Speed: ${speedMs}ms per step`}
            />
            <span className="text-[11px] font-mono text-gray-400 w-10 text-right">{speedMs}ms</span>
          </div>

          {/* Prominent Compare All Button */}
          <button
            id="btn-compare-all"
            onClick={handleCompareAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all ml-1"
            title="Run all 5 algorithms instantaneously on current endpoints"
          >
            <Zap size={14} className="text-amber-300 fill-amber-300" />
            <span>Compare All</span>
          </button>
        </div>
      </div>

      {/* 4. Live Progress / Frame Status Banner */}
      {currentFrame && (
        <div className="px-3.5 py-2 rounded-lg bg-navy-900 border border-slate-800/80 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-400 font-semibold">
              Step {currentFrame.frameIndex} / {trace?.totalSteps ? trace.totalSteps - 1 : 0}:
            </span>
            <span className="truncate max-w-[600px] text-gray-200">{currentFrame.statusText}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 shrink-0">
            <span>Expanded: {currentFrame.expandedNodeIds.length}</span>
            <span>Discovered: {currentFrame.discoveredNodeIds.length}</span>
            <span>Frontier: {currentFrame.frontierNodeIds.length}</span>
          </div>
        </div>
      )}

      {/* 5. Main Visualizer Component (SVG City Map) */}
      <CityMapVisualizer
        key={city.seed}
        city={city}
        startNodeId={startNodeId}
        destNodeId={destNodeId}
        selectionMode={selectionMode}
        onSetSelectionMode={setSelectionMode}
        onSelectStartNode={handleSelectStart}
        onSelectDestNode={handleSelectDest}
        currentFrame={currentFrame}
        activeAlgorithm={selectedAlgorithm}
        comparisonResults={comparisonResults}
        routeVisibility={routeVisibility}
        highlightedAlgorithm={highlightedAlgorithm}
      />

      {/* 6. Comparison & Metrics Section */}
      <div className="space-y-4 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              id="tab-comparison"
              onClick={() => setActiveTab('comparison')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 size={15} />
              <span>Algorithm Comparison Table</span>
            </button>

            <button
              id="tab-charts"
              onClick={() => setActiveTab('charts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'charts'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity size={15} />
              <span>Comparative Visual Charts</span>
            </button>

            <button
              id="tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'insights'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Info size={15} />
              <span>Algorithm Theory & Analysis</span>
            </button>
          </div>

          {/* Route Visibility Quick Toggles */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <span className="text-gray-400 text-[11px] font-semibold uppercase">Show Routes on Map:</span>
            {ALL_ALGORITHMS.map((algo) => {
              const palette = ALGORITHM_PALETTE[algo];
              const isVisible = routeVisibility[algo];
              return (
                <label
                  key={algo}
                  className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium px-2 py-0.5 rounded border transition-colors ${
                    isVisible
                      ? `${palette.bg} ${palette.text} ${palette.border}`
                      : 'bg-navy-900 text-gray-500 border-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => handleToggleRouteVisibility(algo)}
                    className="sr-only"
                  />
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isVisible ? palette.stroke : '#475569' }}
                  />
                  <span>{algo}</span>
                </label>
              );
            })}
            <button
              onClick={() => handleToggleAllRoutes(true)}
              className="text-[11px] text-cyan-400 hover:underline ml-1"
            >
              All
            </button>
            <button
              onClick={() => handleToggleAllRoutes(false)}
              className="text-[11px] text-gray-500 hover:underline"
            >
              None
            </button>
          </div>
        </div>

        {/* Tab 1: Comprehensive Comparison Table */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-navy-950/80 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-navy-900/90 border-b border-slate-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Algorithm</th>
                    <th className="py-3 px-3">Valid Path</th>
                    <th className="py-3 px-3">Execution Time</th>
                    <th className="py-3 px-3">Nodes Expanded</th>
                    <th className="py-3 px-3">Nodes Discovered</th>
                    <th className="py-3 px-3">Road Distance</th>
                    <th className="py-3 px-3">Edge Hops</th>
                    <th className="py-3 px-4">Optimality Guarantee</th>
                    <th className="py-3 px-3 text-center">Map Route</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {ALL_ALGORITHMS.map((algo) => {
                    const res = comparisonResults ? comparisonResults[algo] : null;
                    const palette = ALGORITHM_PALETTE[algo];
                    const isVisible = routeVisibility[algo];
                    const isHighlighted = highlightedAlgorithm === algo;

                    return (
                      <tr
                        key={algo}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          isHighlighted ? 'bg-cyan-500/5' : ''
                        }`}
                      >
                        {/* Algorithm Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: palette.stroke }}
                            />
                            <span className="font-bold text-white text-sm">{algo}</span>
                          </div>
                        </td>

                        {/* Valid Path Badge */}
                        <td className="py-3.5 px-3">
                          {res?.pathFound ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30">
                              <CheckCircle2 size={12} />
                              <span>Found</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[11px] font-semibold border border-rose-500/30">
                              <X size={12} />
                              <span>Unreachable</span>
                            </span>
                          )}
                        </td>

                        {/* Execution Time */}
                        <td className="py-3.5 px-3 font-mono font-medium text-gray-200">
                          {res ? `${res.executionTimeMs.toFixed(2)} ms` : '—'}
                        </td>

                        {/* Nodes Expanded */}
                        <td className="py-3.5 px-3 font-mono text-cyan-300 font-semibold">
                          {res ? res.nodesExpanded : '—'}
                        </td>

                        {/* Nodes Discovered */}
                        <td className="py-3.5 px-3 font-mono text-gray-300">
                          {res ? res.nodesDiscovered : '—'}
                        </td>

                        {/* Path Distance */}
                        <td className="py-3.5 px-3 font-mono font-bold text-white">
                          {res?.pathFound
                            ? res.pathDistanceMeters > 1000
                              ? `${(res.pathDistanceMeters / 1000).toFixed(2)} km`
                              : `${res.pathDistanceMeters} m`
                            : '—'}
                        </td>

                        {/* Edge Hops */}
                        <td className="py-3.5 px-3 font-mono text-gray-200">
                          {res?.pathFound ? `${res.edgeCount} turns` : '—'}
                        </td>

                        {/* Optimality Note */}
                        <td className="py-3.5 px-4 text-gray-300 text-[11px]">
                          {res?.optimalityNote || '—'}
                        </td>

                        {/* Map Overlay Toggle */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleRouteVisibility(algo)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isVisible
                                ? `${palette.bg} ${palette.text} ${palette.border}`
                                : 'bg-navy-900 text-gray-600 border-slate-800'
                            }`}
                            title={isVisible ? 'Hide route on map' : 'Show route on map'}
                          >
                            {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Insights Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Distance vs Hops</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Dijkstra and A* minimize physical geographic road distance. BFS guarantees the minimum turn/hop count, which may follow longer highway segments.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">A* Heuristic Speedup</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    A* evaluates straight-line Haversine distance as an admissible heuristic, pruning unnecessary branches and expanding fewer nodes than unguided Dijkstra.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Greedy & DFS Hazards</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Greedy rushes directly toward the destination coordinates and is easily diverted into dead ends. DFS explores deeply down arbitrary branches without distance guarantees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Recharts Comparative Visual Charts */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart 1: Execution Time (ms) */}
            <div className="p-4 rounded-xl bg-navy-950/80 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span>Execution Time (ms)</span>
                </h3>
                <span className="text-[10px] text-gray-400">Lower is faster</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="algorithm" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(val: any) => [`${val ?? 0} ms`, 'Time']}
                    />
                    <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-time-${entry.algorithm}`} fill={ALGORITHM_PALETTE[entry.algorithm as GraphAlgorithmName]?.stroke || '#06b6d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Node Expansions */}
            <div className="p-4 rounded-xl bg-navy-950/80 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Activity size={14} className="text-cyan-400" />
                  <span>Nodes Expanded</span>
                </h3>
                <span className="text-[10px] text-gray-400">Search effort</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="algorithm" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(val: any) => [`${val ?? 0} nodes`, 'Expanded']}
                    />
                    <Bar dataKey="expanded" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-exp-${entry.algorithm}`} fill={ALGORITHM_PALETTE[entry.algorithm as GraphAlgorithmName]?.stroke || '#06b6d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Path Distance (m) */}
            <div className="p-4 rounded-xl bg-navy-950/80 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <GitBranch size={14} className="text-emerald-400" />
                  <span>Final Path Distance (m)</span>
                </h3>
                <span className="text-[10px] text-gray-400">Shortest distance</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="algorithm" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(val: any) => [`${val ?? 0} meters`, 'Distance']}
                    />
                    <Bar dataKey="distanceM" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-dist-${entry.algorithm}`} fill={ALGORITHM_PALETTE[entry.algorithm as GraphAlgorithmName]?.stroke || '#06b6d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Algorithm Theory & Analysis */}
        {activeTab === 'insights' && (
          <div className="p-5 rounded-xl bg-navy-950/80 border border-slate-800 shadow-xl space-y-4 text-xs text-gray-300">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles size={16} className="text-cyan-400" />
              <span>Analysis of Algorithms on City Road Topologies</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  1. Dijkstra's Algorithm (Cost-Optimal Baseline)
                </h4>
                <p className="leading-relaxed">
                  Dijkstra systematically explores road intersections in concentric rings ordered by accumulated road distance <code className="bg-navy-900 px-1 py-0.5 rounded text-cyan-300">g(n)</code>. Since road edge distances are strictly positive, Dijkstra provably finds the shortest physical road route. However, it explores symmetrically in all directions, expending computation on nodes heading away from the destination.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  2. A* Search (Heuristic-Guided Optimality)
                </h4>
                <p className="leading-relaxed">
                  A* combines the proven cost <code className="bg-navy-900 px-1 py-0.5 rounded text-emerald-300">g(n)</code> with an admissible straight-line Haversine heuristic <code className="bg-navy-900 px-1 py-0.5 rounded text-emerald-300">h(n)</code> to compute priority <code className="bg-navy-900 px-1 py-0.5 rounded text-emerald-300">f(n) = g(n) + h(n)</code>. Because straight-line distance is always less than or equal to actual road network distance, A* is mathematically guaranteed to find the identical optimal route as Dijkstra, while dramatically reducing the number of expanded intersections.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  3. Breadth-First Search (Edge-Hop Optimality)
                </h4>
                <p className="leading-relaxed">
                  BFS treats every road segment as having equal weight (1 hop). It provably finds the path with the <strong>minimum number of intersections / turns</strong>. On real or synthetic road networks with mixed speed limits or long highway segments, BFS may select a route that has fewer turns but is physically longer in meters than Dijkstra’s route.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  4. Greedy Best-First Search (Goal-Directed Heuristic)
                </h4>
                <p className="leading-relaxed">
                  Greedy relies solely on <code className="bg-navy-900 px-1 py-0.5 rounded text-amber-300">f(n) = h(n)</code> to guide its queue. It rapidly charges toward the destination coordinates. However, it ignores accumulated distance and can be misled by water barriers, rivers, and dead ends, frequently taking long, inefficient detours.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-gray-400 text-[11px]">
              <span>RouteX AOA Benchmark Suite • Synthetic Metropolitan Topology • Seed: {city.seed}</span>
              <span className="text-cyan-400">All benchmarks run locally with verified mathematical guarantees</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
