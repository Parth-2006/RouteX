import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play, Pause, SkipForward, RotateCcw, Zap,
  MousePointer, Square, Weight, Flag, Target, Gauge
} from 'lucide-react';
import { Grid, CellType, AlgorithmName, AlgorithmResult } from '../algorithms/types';
import { createGrid, posEqual, posKey } from '../algorithms/grid';
import { runAlgorithm, runAllAlgorithms, ALL_ALGORITHMS } from '../algorithms/benchmark';
import { ALGORITHM_COLORS, formatTime } from '../utils/helpers';

type Tool = 'start' | 'end' | 'wall' | 'weight' | 'erase';

const GRID_ROWS = 25;
const GRID_COLS = 40;

export function Visualizer() {
  const [grid, setGrid] = useState<Grid>(() =>
    createGrid(GRID_ROWS, GRID_COLS, { row: 2, col: 2 }, { row: GRID_ROWS - 3, col: GRID_COLS - 3 })
  );
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmName>('A*');
  const [tool, setTool] = useState<Tool>('wall');
  const [speed, setSpeed] = useState<number>(20); // ms per step
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set());
  const [pathCells, setPathCells] = useState<Set<string>>(new Set());
  const [currentResult, setCurrentResult] = useState<AlgorithmResult | null>(null);
  const [compareResults, setCompareResults] = useState<AlgorithmResult[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const animRef = useRef<number | null>(null);
  const stepIndexRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const resultRef = useRef<AlgorithmResult | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const clearVisualization = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setVisitedCells(new Set());
    setPathCells(new Set());
    setCurrentResult(null);
    setCompareResults(null);
    setIsAnimating(false);
    setIsPaused(false);
    stepIndexRef.current = 0;
    resultRef.current = null;
  }, []);

  const resetGrid = useCallback(() => {
    clearVisualization();
    setGrid(createGrid(GRID_ROWS, GRID_COLS, { row: 2, col: 2 }, { row: GRID_ROWS - 3, col: GRID_COLS - 3 }));
  }, [clearVisualization]);

  const handleCellInteraction = useCallback((row: number, col: number) => {
    setGrid(prev => {
      const next = { ...prev, cells: prev.cells.map(r => r.map(c => ({ ...c }))) };
      const cell = next.cells[row][col];
      if (posEqual(cell.pos, prev.start) && tool !== 'start') return prev;
      if (posEqual(cell.pos, prev.end) && tool !== 'end') return prev;

      switch (tool) {
        case 'start':
          next.start = { row, col };
          break;
        case 'end':
          next.end = { row, col };
          break;
        case 'wall':
          cell.type = CellType.Wall;
          cell.weight = 1;
          break;
        case 'weight':
          cell.type = CellType.Weighted;
          cell.weight = 5;
          break;
        case 'erase':
          cell.type = CellType.Empty;
          cell.weight = 1;
          break;
      }
      return next;
    });
  }, [tool]);

  const animateResult = useCallback((result: AlgorithmResult) => {
    resultRef.current = result;
    setCurrentResult(result);
    setIsAnimating(true);
    setIsPaused(false);
    stepIndexRef.current = 0;
    setVisitedCells(new Set());
    setPathCells(new Set());

    const visited = result.visitedOrder;
    const path = result.path;

    function step() {
      if (isPausedRef.current) {
        animRef.current = requestAnimationFrame(step);
        return;
      }

      const idx = stepIndexRef.current;
      if (idx < visited.length) {
        setVisitedCells(prev => new Set(prev).add(posKey(visited[idx])));
        stepIndexRef.current++;
        animRef.current = window.setTimeout(() => {
          animRef.current = requestAnimationFrame(step);
        }, speed) as unknown as number;
      } else {
        // Show path
        const pathSet = new Set<string>();
        let pathIdx = 0;
        function showPath() {
          if (pathIdx < path.length) {
            pathSet.add(posKey(path[pathIdx]));
            setPathCells(new Set(pathSet));
            pathIdx++;
            animRef.current = window.setTimeout(() => {
              requestAnimationFrame(showPath);
            }, speed * 2) as unknown as number;
          } else {
            setIsAnimating(false);
          }
        }
        showPath();
      }
    }
    requestAnimationFrame(step);
  }, [speed]);

  const handleRun = useCallback(() => {
    clearVisualization();
    const result = runAlgorithm(selectedAlgorithm, grid);
    animateResult(result);
  }, [grid, selectedAlgorithm, clearVisualization, animateResult]);

  const handleStep = useCallback(() => {
    if (!resultRef.current) {
      const result = runAlgorithm(selectedAlgorithm, grid);
      resultRef.current = result;
      setCurrentResult(result);
      setIsAnimating(true);
      setIsPaused(true);
      stepIndexRef.current = 0;
    }

    const result = resultRef.current;
    if (!result) return;

    const idx = stepIndexRef.current;
    if (idx < result.visitedOrder.length) {
      setVisitedCells(prev => new Set(prev).add(posKey(result.visitedOrder[idx])));
      stepIndexRef.current++;
    } else if (idx < result.visitedOrder.length + result.path.length) {
      const pathIdx = idx - result.visitedOrder.length;
      setPathCells(prev => new Set(prev).add(posKey(result.path[pathIdx])));
      stepIndexRef.current++;
    } else {
      setIsAnimating(false);
    }
  }, [grid, selectedAlgorithm]);

  const handlePause = useCallback(() => {
    setIsPaused(p => !p);
  }, []);

  const handleCompareAll = useCallback(() => {
    clearVisualization();
    const results = runAllAlgorithms(grid);
    setCompareResults(results);
  }, [grid, clearVisualization]);

  const getCellColor = (row: number, col: number): string => {
    const pos = { row, col };
    const key = posKey(pos);

    if (posEqual(pos, grid.start)) return 'bg-cell-start';
    if (posEqual(pos, grid.end)) return 'bg-cell-end';
    if (pathCells.has(key)) return 'bg-cell-path path-cell';
    if (visitedCells.has(key)) return 'bg-cell-visited';

    const cell = grid.cells[row][col];
    if (cell.type === CellType.Wall) return 'bg-cell-wall';
    if (cell.type === CellType.Weighted) return 'bg-cell-weighted';
    return 'bg-cell-empty';
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: 'wall', label: 'Wall', icon: <Square size={14} /> },
    { id: 'weight', label: 'Weight', icon: <Weight size={14} /> },
    { id: 'erase', label: 'Erase', icon: <MousePointer size={14} /> },
    { id: 'start', label: 'Start', icon: <Flag size={14} /> },
    { id: 'end', label: 'End', icon: <Target size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Gauge className="text-cyan-accent" size={24} />
        Interactive Visualizer
      </h1>

      {/* Controls */}
      <div className="bg-navy-800 border border-slate-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Algorithm select */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Algorithm:</label>
            <select
              value={selectedAlgorithm}
              onChange={e => setSelectedAlgorithm(e.target.value as AlgorithmName)}
              className="bg-navy-700 border border-slate-border rounded px-2 py-1.5 text-gray-200 text-sm"
              disabled={isAnimating}
            >
              {ALL_ALGORITHMS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Speed:</label>
            <input
              type="range"
              min={1}
              max={100}
              value={101 - speed}
              onChange={e => setSpeed(101 - Number(e.target.value))}
              className="w-20 accent-cyan-accent"
            />
          </div>

          {/* Tools */}
          <div className="flex items-center gap-1 border-l border-slate-border pl-3">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className={`p-1.5 rounded text-xs ${
                  tool === t.id
                    ? 'bg-cyan-accent/15 text-cyan-accent'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 border-l border-slate-border pl-3">
            <button onClick={handleRun} disabled={isAnimating && !isPaused} id="viz-run-btn"
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-accent hover:bg-cyan-glow text-navy-900 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
              <Play size={14} /> Run
            </button>
            <button onClick={handlePause} disabled={!isAnimating} id="viz-pause-btn"
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-border text-gray-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              <Pause size={14} /> {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={handleStep} id="viz-step-btn"
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-border text-gray-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              <SkipForward size={14} /> Step
            </button>
            <button onClick={resetGrid} id="viz-reset-btn"
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-border text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={handleCompareAll} disabled={isAnimating} id="viz-compare-btn"
              className="flex items-center gap-1 px-3 py-1.5 border border-cyan-accent/30 text-cyan-accent hover:bg-cyan-accent/10 rounded-lg text-sm transition-colors disabled:opacity-50">
              <Zap size={14} /> Compare All
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-navy-800 border border-slate-border rounded-xl p-3 overflow-x-auto">
        <div
          className="inline-grid gap-px"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          onMouseLeave={() => setIsDrawing(false)}
        >
          {grid.cells.flat().map((cell) => (
            <div
              key={`${cell.pos.row}-${cell.pos.col}`}
              className={`w-4 h-4 sm:w-5 sm:h-5 grid-cell cursor-pointer rounded-[2px] ${getCellColor(cell.pos.row, cell.pos.col)}`}
              onMouseDown={() => { setIsDrawing(true); handleCellInteraction(cell.pos.row, cell.pos.col); }}
              onMouseEnter={() => { if (isDrawing) handleCellInteraction(cell.pos.row, cell.pos.col); }}
              onMouseUp={() => setIsDrawing(false)}
              title={
                posEqual(cell.pos, grid.start) ? 'Start' :
                posEqual(cell.pos, grid.end) ? 'End' :
                cell.type === CellType.Weighted ? `Weight: ${cell.weight}` :
                cell.type === CellType.Wall ? 'Wall' : 'Empty'
              }
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cell-start" /> Start</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cell-end" /> End</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cell-wall" /> Wall</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cell-weighted" /> Weighted</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cell-visited" /> Visited</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cell-path" /> Path</span>
      </div>

      {/* Live stats */}
      {currentResult && (
        <div className="bg-navy-800 border border-slate-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            {currentResult.name} Results
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Path Found" value={currentResult.pathFound ? 'Yes' : 'No'} color={currentResult.pathFound ? 'text-green-400' : 'text-red-400'} />
            <Stat label="Path Cost" value={currentResult.pathFound ? String(currentResult.pathCost) : '—'} />
            <Stat label="Nodes Expanded" value={String(currentResult.nodesExpanded)} />
            <Stat label="Execution Time" value={formatTime(currentResult.executionTimeMs)} />
            <Stat label="Path Length" value={currentResult.pathFound ? String(currentResult.path.length) : '—'} />
            <Stat label="Peak Frontier" value={String(currentResult.peakFrontierSize)} />
            <Stat label="Optimal" value={currentResult.guaranteesOptimal ? 'Yes' : 'No'} color={currentResult.guaranteesOptimal ? 'text-cyan-accent' : 'text-yellow-400'} />
          </div>
        </div>
      )}

      {/* Compare All results */}
      {compareResults && (
        <div className="bg-navy-800 border border-slate-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Compare All Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-navy-700/50">
                  <th className="px-3 py-2 text-left text-gray-400">Algorithm</th>
                  <th className="px-3 py-2 text-right text-gray-400">Path Found</th>
                  <th className="px-3 py-2 text-right text-gray-400">Cost</th>
                  <th className="px-3 py-2 text-right text-gray-400">Length</th>
                  <th className="px-3 py-2 text-right text-gray-400">Expanded</th>
                  <th className="px-3 py-2 text-right text-gray-400">Frontier</th>
                  <th className="px-3 py-2 text-right text-gray-400">Time</th>
                  <th className="px-3 py-2 text-right text-gray-400">Optimal</th>
                </tr>
              </thead>
              <tbody>
                {compareResults.map(r => (
                  <tr key={r.name} className="border-t border-slate-border/30">
                    <td className="px-3 py-2 text-white font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ALGORITHM_COLORS[r.name] }} />
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={r.pathFound ? 'text-green-400' : 'text-red-400'}>{r.pathFound ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">{r.pathFound ? r.pathCost : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{r.pathFound ? r.path.length : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{r.nodesExpanded}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{r.peakFrontierSize}</td>
                    <td className="px-3 py-2 text-right text-gray-300 font-mono">{formatTime(r.executionTimeMs)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={r.guaranteesOptimal ? 'text-cyan-accent' : 'text-yellow-400'}>
                        {r.guaranteesOptimal ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-gray-500 text-xs">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}
