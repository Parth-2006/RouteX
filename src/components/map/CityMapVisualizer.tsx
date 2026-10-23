import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  MapPin,
  Flag,
  X,
  RotateCcw,
} from 'lucide-react';
import { GraphAlgorithmName, GraphAlgorithmResult } from '../../algorithms/graph/types';
import { SyntheticCity } from '../../algorithms/graph/syntheticCityGenerator';
import { SearchFrame } from '../../algorithms/graph/searchTracer';
import { ALGORITHM_PALETTE } from './mapPalette';


export type SelectionMode = 'none' | 'start' | 'dest';

interface CityMapVisualizerProps {
  city: SyntheticCity;
  startNodeId: string;
  destNodeId: string;
  selectionMode: SelectionMode;
  onSetSelectionMode: (mode: SelectionMode) => void;
  onSelectStartNode: (nodeId: string) => void;
  onSelectDestNode: (nodeId: string) => void;
  currentFrame?: SearchFrame | null;
  activeAlgorithm?: GraphAlgorithmName;
  comparisonResults?: Record<GraphAlgorithmName, GraphAlgorithmResult> | null;
  routeVisibility?: Record<GraphAlgorithmName, boolean>;
  highlightedAlgorithm?: GraphAlgorithmName | null;
}

export function CityMapVisualizer({
  city,
  startNodeId,
  destNodeId,
  selectionMode,
  onSetSelectionMode,
  onSelectStartNode,
  onSelectDestNode,
  currentFrame,
  activeAlgorithm = 'A*',
  comparisonResults,
  routeVisibility,
  highlightedAlgorithm,
}: CityMapVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport dimensions & Fullscreen
  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Hovered node
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Selected node popup (for normal click)
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: Math.floor(entry.contentRect.width),
            height: Math.floor(entry.contentRect.height),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute coordinate mapping: [lat, lng] to screen space [x, y]
  const { minLat, maxLat, minLng, maxLng } = city.bounds;
  const padding = 32;

  const projectCoord = useCallback(
    (lat: number, lng: number): [number, number] => {
      const latRange = maxLat - minLat || 0.01;
      const lngRange = maxLng - minLng || 0.01;

      const availWidth = Math.max(100, dimensions.width - padding * 2);
      const availHeight = Math.max(100, dimensions.height - padding * 2);

      // Invert lat because higher lat is further north (lower Y in SVG)
      const x = padding + ((lng - minLng) / lngRange) * availWidth;
      const y = padding + ((maxLat - lat) / latRange) * availHeight;
      return [x, y];
    },
    [minLat, maxLat, minLng, maxLng, dimensions.width, dimensions.height]
  );

  // Fit network to screen
  const fitToNetwork = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Zoom handlers
  const handleZoom = useCallback((factor: number, clientX?: number, clientY?: number) => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(0.5, Math.min(5.0, Number((prevZoom * factor).toFixed(2))));
      if (clientX !== undefined && clientY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cursorX = clientX - rect.left;
        const cursorY = clientY - rect.top;

        setPan((prevPan) => {
          const ratio = newZoom / prevZoom;
          const newPanX = cursorX - (cursorX - prevPan.x) * ratio;
          const newPanY = cursorY - (cursorY - prevPan.y) * ratio;
          return { x: newPanX, y: newPanY };
        });
      }
      return newZoom;
    });
  }, []);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    handleZoom(factor, e.clientX, e.clientY);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gesture support
  const touchStartRef = useRef<{ x: number; y: number; dist: number }>({ x: 0, y: 0, dist: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const factor = newDist / touchStartRef.current.dist;
      if (Math.abs(factor - 1) > 0.03) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        handleZoom(factor > 1 ? 1.05 : 0.95, midX, midY);
        touchStartRef.current.dist = newDist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current.dist = 0;
  };

  // Node interaction
  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (selectionMode === 'start') {
      onSelectStartNode(nodeId);
      onSetSelectionMode('none');
      setClickedNodeId(null);
    } else if (selectionMode === 'dest') {
      onSelectDestNode(nodeId);
      onSetSelectionMode('none');
      setClickedNodeId(null);
    } else {
      // Show node action card
      setClickedNodeId((prev) => (prev === nodeId ? null : nodeId));
    }
  };

  // Escape key cancels selection mode or exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
        onSetSelectionMode('none');
        setClickedNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSetSelectionMode, isFullscreen]);

  // Sets for quick frame lookups
  const expandedSet = useMemo(() => new Set(currentFrame?.expandedNodeIds || []), [currentFrame]);
  const discoveredSet = useMemo(() => new Set(currentFrame?.discoveredNodeIds || []), [currentFrame]);
  const frontierSet = useMemo(() => new Set(currentFrame?.frontierNodeIds || []), [currentFrame]);
  const exploredEdgesSet = useMemo(() => new Set(currentFrame?.exploredEdgeKeys || []), [currentFrame]);
  const finalPathSet = useMemo(() => new Set(currentFrame?.finalPathNodeIds || []), [currentFrame]);

  // Project roads to SVG paths
  const projectedRoads = useMemo(() => {
    return city.roads.map((road) => {
      const points = road.geometry.map(([lat, lng]) => projectCoord(lat, lng));
      const pathD = points.reduce((acc, [x, y], idx) => {
        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, '');

      const isExplored =
        exploredEdgesSet.has(`${road.from}->${road.to}`) || exploredEdgesSet.has(`${road.to}->${road.from}`);

      return {
        ...road,
        pathD,
        isExplored,
      };
    });
  }, [city.roads, projectCoord, exploredEdgesSet]);

  // Waterway path string
  const waterPaths = useMemo(() => {
    return city.waterCorridors.map((corridor) => {
      const pts = corridor.path.map(([lat, lng]) => projectCoord(lat, lng));
      return pts.reduce((acc, [x, y], idx) => (idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), '');
    });
  }, [city.waterCorridors, projectCoord]);

  // Park polygons
  const parkPolygons = useMemo(() => {
    return city.parks.map((park) => {
      const pts = park.polygon.map(([lat, lng]) => projectCoord(lat, lng)).map(([x, y]) => `${x},${y}`).join(' ');
      return { ...park, points: pts };
    });
  }, [city.parks, projectCoord]);

  // Active node objects
  const startNode = city.graph.nodes.get(startNodeId);
  const destNode = city.graph.nodes.get(destNodeId);
  const startCoord = startNode ? projectCoord(startNode.lat, startNode.lng) : null;
  const destCoord = destNode ? projectCoord(destNode.lat, destNode.lng) : null;

  // Single active algorithm final path (from current animation frame)
  const finalCoords = currentFrame?.finalPathCoordinates;
  const animatedFinalPathD = useMemo(() => {
    if (!finalCoords || finalCoords.length < 2) return null;
    const pts = finalCoords.map(([lat, lng]) => projectCoord(lat, lng));
    return pts.reduce((acc, [x, y], idx) => (idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), '');
  }, [finalCoords, projectCoord]);

  // Multi-route comparison overlays
  const comparisonRoutes = useMemo(() => {
    if (!comparisonResults) return [];
    const routes: {
      algorithm: GraphAlgorithmName;
      pathD: string;
      color: string;
      glow: string;
      width: number;
      dash?: string;
      isHighlighted: boolean;
    }[] = [];

    const keys: GraphAlgorithmName[] = ['Dijkstra', 'A*', 'BFS', 'Greedy', 'DFS'];
    for (const key of keys) {
      if (routeVisibility && !routeVisibility[key]) continue;
      const res = comparisonResults[key];
      if (!res || !res.pathFound || res.pathCoordinates.length < 2) continue;

      const pts = res.pathCoordinates.map(([lat, lng]) => projectCoord(lat, lng));
      const pathD = pts.reduce((acc, [x, y], idx) => (idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), '');
      const palette = ALGORITHM_PALETTE[key];
      const isHighlighted = highlightedAlgorithm === key;

      routes.push({
        algorithm: key,
        pathD,
        color: palette.stroke,
        glow: palette.glow,
        width: isHighlighted ? palette.offsetWidth + 2.5 : palette.offsetWidth,
        dash: palette.dash,
        isHighlighted,
      });
    }
    return routes;
  }, [comparisonResults, routeVisibility, highlightedAlgorithm, projectCoord]);

  const clickedNode = clickedNodeId ? city.graph.nodes.get(clickedNodeId) : null;
  const clickedIntersection = clickedNodeId ? city.intersections.find((n) => n.id === clickedNodeId) : null;
  const clickedCoord = clickedNode ? projectCoord(clickedNode.lat, clickedNode.lng) : null;

  return (
    <div
      ref={containerRef}
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-none'
          : 'relative w-full h-[750px] lg:h-[820px] xl:h-[880px] rounded-xl border border-slate-800/90'
      } bg-[#070b19] overflow-hidden select-none ${
        selectionMode !== 'none' ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => setClickedNodeId(null)}
    >
      {/* 1. Header Banner & Honest Simulation Label */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-navy-950/85 backdrop-blur border border-slate-700/60 shadow-lg flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide text-white flex items-center gap-1.5">
              <span>{city.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/15 text-cyan-300 rounded font-mono border border-cyan-500/30">
                SIMULATED ROAD NETWORK
              </span>
            </span>
            <span className="text-[10px] text-gray-400">
              {city.graph.nodeCount} Intersections • {city.roads.length} Road Segments • {city.roads.filter((r) => r.type === 'bridge').length} Bridge Channels • Seed: {city.seed}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Selection Mode Banner */}
      {selectionMode !== 'none' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2 rounded-full backdrop-blur-md border shadow-xl flex items-center gap-3 ${
              selectionMode === 'start'
                ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200 shadow-emerald-500/20'
                : 'bg-pink-950/90 border-pink-500/70 text-pink-200 shadow-pink-500/20'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full animate-ping ${
                selectionMode === 'start' ? 'bg-emerald-400' : 'bg-pink-400'
              }`}
            />
            <span className="text-xs font-bold tracking-wide">
              {selectionMode === 'start'
                ? 'CLICK ANY ROAD INTERSECTION TO SET START'
                : 'CLICK ANY ROAD INTERSECTION TO SET DESTINATION'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetSelectionMode('none');
              }}
              className="p-1 hover:bg-white/10 rounded-full transition-colors ml-1"
              title="Cancel Selection (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2.5 Fullscreen Floating Exit Pill */}
      {isFullscreen && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            id="btn-exit-fullscreen-banner"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-950/90 hover:bg-navy-900 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all hover:border-cyan-400 cursor-pointer"
          >
            <Minimize2 size={13} />
            <span>Exit Fullscreen Mode</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-gray-400 rounded border border-slate-700">ESC</kbd>
          </button>
        </div>
      )}

      {/* 3. Floating Zoom & Framing Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-navy-950/85 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-lg">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoom(1.25);
          }}
          className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoom(0.8);
          }}
          className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} />
        </button>
        <div className="h-px bg-slate-700/60 my-0.5" />
        <button
          id="btn-toggle-fullscreen"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen((prev) => !prev);
          }}
          className="p-1.5 text-gray-300 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fitToNetwork();
          }}
          className="p-1.5 text-gray-300 hover:text-cyan-400 hover:bg-white/10 rounded transition-colors"
          title="Fit Network to View"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors text-[11px] font-mono"
          title="Reset Zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>

      {/* 4. Active Selection Badges (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 pointer-events-none">
        <div className="px-2.5 py-1.5 rounded-lg bg-navy-950/85 backdrop-blur border border-slate-700/60 flex items-center gap-2 shadow">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Start Point</span>
            <span className="text-xs font-medium text-white truncate max-w-[140px]">
              {startNode?.name || startNodeId}
            </span>
          </div>
        </div>

        <div className="px-2.5 py-1.5 rounded-lg bg-navy-950/85 backdrop-blur border border-slate-700/60 flex items-center gap-2 shadow">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_#ec4899]" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Destination</span>
            <span className="text-xs font-medium text-white truncate max-w-[140px]">
              {destNode?.name || destNodeId}
            </span>
          </div>
        </div>
      </div>

      {/* 5. SVG Canvas Layer */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
        }}
      >
        <defs>
          {/* Subtle Cartographic Grid Pattern */}
          <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#11192e" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1" fill="#1e293b" />
          </pattern>

          {/* Glowing Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* River Water Gradient */}
          <linearGradient id="river-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#091d34" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0d2b4d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#091d34" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Layer 1: Background Texture */}
        <rect width={dimensions.width * 2} height={dimensions.height * 2} x="-50%" y="-50%" fill="url(#city-grid)" />

        {/* Layer 2: Parks & Green Plazas */}
        {parkPolygons.map((park) => (
          <polygon
            key={park.id}
            points={park.points}
            fill="#06231c"
            stroke="#0a3c30"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
          />
        ))}

        {/* Layer 3: Natural River Water Corridors */}
        {waterPaths.map((pathD, idx) => (
          <g key={`water-${idx}`}>
            {/* Wide water body */}
            <path
              d={pathD}
              fill="none"
              stroke="#0b2440"
              strokeWidth="56"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
            {/* River corridor inner deep channel */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#river-gradient)"
              strokeWidth="42"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* River bank accent lines */}
            <path
              d={pathD}
              fill="none"
              stroke="#155e75"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.4"
            />
          </g>
        ))}

        {/* Layer 4: Base City Road Network (Unvisited) */}
        {projectedRoads.map((road) => {
          const isBridge = road.type === 'bridge';
          const isMotorway = road.type === 'motorway';
          const isPrimary = road.type === 'primary';
          const isAlley = road.type === 'alley';

          // Base stroke styling
          let strokeColor = '#1f293d';
          let strokeWidth = 2.0;

          if (isBridge) {
            strokeColor = '#475569';
            strokeWidth = 4.5;
          } else if (isMotorway) {
            strokeColor = '#3b4b66';
            strokeWidth = 3.8;
          } else if (isPrimary) {
            strokeColor = '#2b3952';
            strokeWidth = 3.0;
          } else if (isAlley) {
            strokeColor = '#151d2f';
            strokeWidth = 1.4;
          }

          return (
            <g key={road.id}>
              {/* Bridge outer casing */}
              {isBridge && (
                <path
                  d={road.pathD}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="6.5"
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  opacity="0.5"
                />
              )}

              {/* Road segment */}
              <path
                d={road.pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* One-way indicator arrow or bridge markings */}
              {road.oneWay && (
                <path
                  d={road.pathD}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.7"
                />
              )}
            </g>
          );
        })}

        {/* Layer 5: Search Animation Explored Roads & Nodes */}
        {projectedRoads
          .filter((r) => r.isExplored)
          .map((road) => (
            <path
              key={`explored-${road.id}`}
              d={road.pathD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
              filter="url(#glow-cyan)"
            />
          ))}

        {/* Layer 6: Multi-Route Comparison Overlays (When Compare All is active) */}
        {comparisonRoutes.map((route, idx) => (
          <path
            key={`comp-route-${route.algorithm}-${idx}`}
            d={route.pathD}
            fill="none"
            stroke={route.color}
            strokeWidth={route.width}
            strokeDasharray={route.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={route.isHighlighted ? 1.0 : 0.85}
            style={{
              filter: `drop-shadow(0 0 ${route.isHighlighted ? '6px' : '3px'} ${route.glow})`,
            }}
          />
        ))}

        {/* Layer 7: Single Animated Algorithm Final Path */}
        {animatedFinalPathD && (
          <path
            d={animatedFinalPathD}
            fill="none"
            stroke={ALGORITHM_PALETTE[activeAlgorithm]?.stroke || '#06b6d4'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 6px ${ALGORITHM_PALETTE[activeAlgorithm]?.glow || 'rgba(6,182,212,0.8)'})`,
            }}
          />
        )}

        {/* Layer 8: Intersection Nodes */}
        {city.intersections.map((node) => {
          const [cx, cy] = projectCoord(node.lat, node.lng);
          const isStart = node.id === startNodeId;
          const isDest = node.id === destNodeId;
          const isCurrent = currentFrame?.currentNodeId === node.id;
          const isFrontier = frontierSet.has(node.id);
          const isExpanded = expandedSet.has(node.id);
          const isDiscovered = discoveredSet.has(node.id);
          const isInFinalPath = finalPathSet.has(node.id);
          const isHovered = hoveredNodeId === node.id;

          // Don't draw regular dots for Start & Dest (handled by dedicated marker layer)
          if (isStart || isDest) return null;

          let r = 3.5;
          let fill = '#334155';
          let stroke = '#1e293b';
          let strokeWidth = 1.2;

          if (isCurrent) {
            r = 7;
            fill = '#ffffff';
            stroke = '#06b6d4';
            strokeWidth = 3;
          } else if (isInFinalPath) {
            r = 5;
            fill = ALGORITHM_PALETTE[activeAlgorithm]?.stroke || '#06b6d4';
            stroke = '#ffffff';
            strokeWidth = 1.5;
          } else if (isFrontier) {
            r = 5;
            fill = '#f59e0b';
            stroke = '#ffffff';
            strokeWidth = 1.5;
          } else if (isExpanded) {
            r = 4;
            fill = '#06b6d4';
            stroke = '#0e7490';
            strokeWidth = 1.5;
          } else if (isDiscovered) {
            r = 3.8;
            fill = '#0284c7';
            stroke = '#0369a1';
          } else if (node.isDeadEnd) {
            r = 3.2;
            fill = '#ef4444';
            stroke = '#7f1d1d';
          }

          if (isHovered) {
            r += 2.5;
            fill = selectionMode === 'start' ? '#10b981' : selectionMode === 'dest' ? '#ec4899' : '#38bdf8';
            stroke = '#ffffff';
            strokeWidth = 2;
          }

          return (
            <g
              key={node.id}
              className="cursor-pointer transition-all duration-150"
              onClick={(e) => handleNodeClick(node.id, e)}
              onMouseEnter={() => {
                setHoveredNodeId(node.id);
                setHoverPosition({ x: cx, y: cy });
              }}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Invisible larger hit target for easy tapping & clicking */}
              <circle cx={cx} cy={cy} r="14" fill="transparent" />

              {/* Pulsing ring for current node being expanded */}
              {isCurrent && (
                <circle cx={cx} cy={cy} r="12" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.8">
                  <animate attributeName="r" values="6;16;6" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Frontier pulsing halo */}
              {isFrontier && !isCurrent && (
                <circle cx={cx} cy={cy} r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7">
                  <animate attributeName="r" values="5;9;5" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Intersection dot */}
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </g>
          );
        })}

        {/* Layer 9: Distinct Start Marker */}
        {startCoord && (
          <g
            className="cursor-pointer"
            onClick={(e) => handleNodeClick(startNodeId, e)}
            style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.9))' }}
          >
            {/* Animated pulsating radar ring */}
            <circle cx={startCoord[0]} cy={startCoord[1]} r="16" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6">
              <animate attributeName="r" values="10;24;10" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Solid marker base */}
            <circle cx={startCoord[0]} cy={startCoord[1]} r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
            <text
              x={startCoord[0]}
              y={startCoord[1] + 3.5}
              textAnchor="middle"
              fill="#062e22"
              fontSize="10"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              S
            </text>

            {/* Start Label Pill */}
            <g transform={`translate(${startCoord[0]}, ${startCoord[1] - 18})`}>
              <rect x="-24" y="-12" width="48" height="15" rx="4" fill="#062e22" stroke="#10b981" strokeWidth="1" />
              <text x="0" y="-2" textAnchor="middle" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
                START
              </text>
            </g>
          </g>
        )}

        {/* Layer 10: Distinct Destination Marker */}
        {destCoord && (
          <g
            className="cursor-pointer"
            onClick={(e) => handleNodeClick(destNodeId, e)}
            style={{ filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.9))' }}
          >
            {/* Animated pulsating target ring */}
            <circle cx={destCoord[0]} cy={destCoord[1]} r="16" fill="none" stroke="#ec4899" strokeWidth="2" opacity="0.6">
              <animate attributeName="r" values="10;24;10" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Solid marker base */}
            <circle cx={destCoord[0]} cy={destCoord[1]} r="10" fill="#ec4899" stroke="#ffffff" strokeWidth="2.5" />
            <text
              x={destCoord[0]}
              y={destCoord[1] + 3.5}
              textAnchor="middle"
              fill="#370a21"
              fontSize="10"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              D
            </text>

            {/* Destination Label Pill */}
            <g transform={`translate(${destCoord[0]}, ${destCoord[1] - 18})`}>
              <rect x="-22" y="-12" width="44" height="15" rx="4" fill="#370a21" stroke="#ec4899" strokeWidth="1" />
              <text x="0" y="-2" textAnchor="middle" fill="#f472b6" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
                DEST
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* 6. Intersection Tooltip on Hover */}
      {hoveredNodeId && hoverPosition && !clickedNodeId && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1.5 rounded-lg bg-navy-950/95 backdrop-blur-md border border-slate-700 text-left shadow-2xl transition-all"
          style={{
            left: `${hoverPosition.x * zoom + pan.x}px`,
            top: `${hoverPosition.y * zoom + pan.y - 12}px`,
          }}
        >
          {(() => {
            const n = city.intersections.find((item) => item.id === hoveredNodeId);
            if (!n) return null;
            const degree = city.graph.adjacency.get(nodeIdOrDefault(hoveredNodeId))?.length || 0;
            return (
              <div className="flex flex-col gap-0.5 min-w-[120px]">
                <span className="text-xs font-semibold text-white">{n.name}</span>
                <span className="text-[10px] text-cyan-400">{n.district}</span>
                <span className="text-[9px] text-gray-400 font-mono">
                  Degree: {degree} roads • {n.isDeadEnd ? 'Dead End' : 'Connected'}
                </span>
                {selectionMode !== 'none' && (
                  <span
                    className={`text-[10px] font-bold mt-1 ${
                      selectionMode === 'start' ? 'text-emerald-400' : 'text-pink-400'
                    }`}
                  >
                    Click to set as {selectionMode === 'start' ? 'START' : 'DESTINATION'}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 7. Clicked Node Popover Menu (Normal Click) */}
      {clickedNode && clickedCoord && selectionMode === 'none' && (
        <div
          className="absolute z-40 transform -translate-x-1/2 -translate-y-full mb-4 p-3 rounded-xl bg-navy-950/95 backdrop-blur-md border border-cyan-500/40 text-left shadow-2xl min-w-[200px]"
          style={{
            left: `${clickedCoord[0] * zoom + pan.x}px`,
            top: `${clickedCoord[1] * zoom + pan.y - 14}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div>
              <h4 className="text-xs font-bold text-white">{clickedNode.name || clickedNode.id}</h4>
              <p className="text-[10px] text-cyan-400">{clickedIntersection?.district || 'Metropolitan Area'}</p>
            </div>
            <button
              onClick={() => setClickedNodeId(null)}
              className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                onSelectStartNode(clickedNode.id);
                setClickedNodeId(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
            >
              <Flag size={13} className="text-emerald-400" />
              <span>Set as START Point</span>
            </button>

            <button
              onClick={() => {
                onSelectDestNode(clickedNode.id);
                setClickedNodeId(null);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-semibold transition-colors"
            >
              <MapPin size={13} className="text-pink-400" />
              <span>Set as DESTINATION</span>
            </button>
          </div>
        </div>
      )}

      {/* 8. Interactive Legend & Map Controls (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-navy-950/85 backdrop-blur border border-slate-700/60 shadow flex items-center gap-3 text-[10px] text-gray-300">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span>Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_6px_#ec4899]" />
            <span>Dest</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
            <span>Explored</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span>Frontier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-1.5 bg-slate-400 rounded-sm" />
            <span>Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function nodeIdOrDefault(id: string): string {
  return id;
}
