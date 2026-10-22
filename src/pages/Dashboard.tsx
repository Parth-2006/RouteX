import { useState, useCallback } from 'react';
import { Play, Download, Loader2, BarChart3, Zap, Timer, Route, Brain, Layers } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { ScenarioBenchmarkResult, AlgorithmName } from '../algorithms/types';
import { SCENARIOS } from '../algorithms/scenarios';
import { benchmarkAllAlgorithms, exportToCSV, ALL_ALGORITHMS } from '../algorithms/benchmark';
import { ALGORITHM_COLORS, formatTime, formatNumber, downloadFile } from '../utils/helpers';

export function Dashboard() {
  const [results, setResults] = useState<ScenarioBenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<number>(0);
  const [iterations, setIterations] = useState(5);

  const runBenchmarks = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to avoid blocking UI
    setTimeout(() => {
      const benchmarkResults: ScenarioBenchmarkResult[] = SCENARIOS.map(scenario => {
        const grid = scenario.generator(scenario.gridRows, scenario.gridCols, scenario.seed);
        const scenarioResults = benchmarkAllAlgorithms(grid, iterations);
        return {
          scenarioName: scenario.name,
          scenarioDescription: scenario.description,
          gridSize: `${scenario.gridRows}×${scenario.gridCols}`,
          results: scenarioResults,
        };
      });
      setResults(benchmarkResults);
      setIsRunning(false);
    }, 50);
  }, [iterations]);

  const handleExportCSV = useCallback(() => {
    if (results.length === 0) return;
    const csv = exportToCSV(results);
    downloadFile(csv, `routex-benchmark-${Date.now()}.csv`);
  }, [results]);

  const currentScenario = results[selectedScenario] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-cyan-accent" size={24} />
            Algorithm Comparison Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Run all five algorithms on identical inputs and compare their performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            Iterations:
            <select
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              className="bg-navy-700 border border-slate-border rounded px-2 py-1 text-gray-200 text-sm"
              disabled={isRunning}
            >
              {[3, 5, 7, 11].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            onClick={runBenchmarks}
            disabled={isRunning}
            id="run-benchmarks-btn"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-accent hover:bg-cyan-glow text-navy-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {isRunning ? 'Running…' : 'Run Benchmarks'}
          </button>
          {results.length > 0 && (
            <button
              onClick={handleExportCSV}
              id="export-csv-btn"
              className="flex items-center gap-2 px-3 py-2 border border-slate-border text-gray-300 hover:text-white hover:border-cyan-accent/50 rounded-lg transition-colors text-sm"
            >
              <Download size={14} />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* No results prompt */}
      {results.length === 0 && !isRunning && (
        <div className="bg-navy-800 border border-slate-border rounded-xl p-12 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-lg font-medium text-gray-300 mb-2">Ready to Compare</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Click "Run Benchmarks" to execute BFS, DFS, Dijkstra, A*, and Greedy on {SCENARIOS.length} different scenarios.
            Each algorithm runs {iterations} times and the median is reported.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isRunning && (
        <div className="bg-navy-800 border border-slate-border rounded-xl p-12 text-center">
          <Loader2 size={48} className="mx-auto text-cyan-accent mb-4 animate-spin" />
          <h2 className="text-lg font-medium text-gray-300">Running Benchmarks…</h2>
          <p className="text-gray-500 text-sm mt-1">Executing {ALL_ALGORITHMS.length} algorithms × {SCENARIOS.length} scenarios × {iterations} iterations</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !isRunning && (
        <>
          {/* Scenario selector */}
          <div className="flex gap-2 flex-wrap">
            {results.map((scenario, idx) => (
              <button
                key={scenario.scenarioName}
                onClick={() => setSelectedScenario(idx)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  idx === selectedScenario
                    ? 'bg-cyan-accent/15 text-cyan-accent border border-cyan-accent/30'
                    : 'bg-navy-800 text-gray-400 border border-slate-border hover:text-white hover:border-gray-600'
                }`}
              >
                {scenario.scenarioName}
              </button>
            ))}
          </div>

          {currentScenario && (
            <>
              {/* Scenario info */}
              <div className="bg-navy-800 border border-slate-border rounded-xl p-4">
                <h2 className="text-white font-semibold">{currentScenario.scenarioName}</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {currentScenario.scenarioDescription} • Grid: {currentScenario.gridSize}
                </p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {currentScenario.results.map(r => (
                  <div key={r.name} className="bg-navy-800 border border-slate-border rounded-xl p-3 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ALGORITHM_COLORS[r.name] }} />
                      <span className="text-sm font-semibold text-white">{r.name}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Path:</span>
                        <span className={r.pathFound ? 'text-green-400' : 'text-red-400'}>
                          {r.pathFound ? `${r.path.length} cells` : 'Not found'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cost:</span>
                        <span className="text-gray-300">{r.pathCost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Time:</span>
                        <span className="text-gray-300">{formatTime(r.executionTimeMs)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Optimal:</span>
                        <span className={r.guaranteesOptimal ? 'text-cyan-accent' : 'text-yellow-400'}>
                          {r.guaranteesOptimal ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Methodology note */}
                <div className="bg-navy-800/50 border border-slate-border/50 rounded-xl p-3 flex flex-col justify-center">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    ⓘ Median of {iterations} runs via <code className="text-gray-400">performance.now()</code>.
                    Peak frontier = memory proxy, not actual RAM.
                  </p>
                </div>
              </div>

              {/* Comparison table */}
              <div className="bg-navy-800 border border-slate-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-border flex items-center gap-2">
                  <Layers size={16} className="text-cyan-accent" />
                  <h3 className="font-semibold text-white text-sm">Detailed Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-navy-700/50">
                        <th className="px-4 py-2.5 text-left text-gray-400 font-medium">Algorithm</th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">
                          <span className="inline-flex items-center gap-1"><Route size={12} />Path Found</span>
                        </th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Path Length</th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Path Cost</th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">
                          <span className="inline-flex items-center gap-1"><Zap size={12} />Nodes Expanded</span>
                        </th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Nodes Discovered</th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">
                          <span className="inline-flex items-center gap-1"><Brain size={12} />Peak Frontier*</span>
                        </th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">
                          <span className="inline-flex items-center gap-1"><Timer size={12} />Time (ms)</span>
                        </th>
                        <th className="px-4 py-2.5 text-right text-gray-400 font-medium">Optimal?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentScenario.results.map(r => (
                        <tr key={r.name} className="border-t border-slate-border/50 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ALGORITHM_COLORS[r.name] }} />
                              <span className="font-medium text-white">{r.name}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.pathFound ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                              {r.pathFound ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{r.pathFound ? r.path.length : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{r.pathFound ? r.pathCost : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{r.nodesExpanded}</td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{r.nodesDiscovered}</td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{r.peakFrontierSize}</td>
                          <td className="px-4 py-2.5 text-right text-gray-300 font-mono text-xs">{formatNumber(r.executionTimeMs, 3)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={r.guaranteesOptimal ? 'text-cyan-accent' : 'text-yellow-400'}>
                              {r.guaranteesOptimal ? '✓ Yes' : '✗ No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 text-[10px] text-gray-600 border-t border-slate-border/50">
                  * Peak Frontier Size is a proxy for memory usage (number of nodes in the open set), not actual memory consumption in bytes.
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Nodes Expanded" icon={<Zap size={14} className="text-cyan-accent" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={currentScenario.results.map(r => ({ name: r.name, value: r.nodesExpanded }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="value" name="Nodes Expanded" radius={[4, 4, 0, 0]}>
                        {currentScenario.results.map(r => (
                          <rect key={r.name} fill={ALGORITHM_COLORS[r.name as AlgorithmName]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Execution Time (ms)" icon={<Timer size={14} className="text-cyan-accent" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={currentScenario.results.map(r => ({ name: r.name, value: Number(r.executionTimeMs.toFixed(3)) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="value" name="Time (ms)" radius={[4, 4, 0, 0]}>
                        {currentScenario.results.map(r => (
                          <rect key={r.name} fill={ALGORITHM_COLORS[r.name as AlgorithmName]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Path Cost Comparison" icon={<Route size={14} className="text-cyan-accent" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={currentScenario.results.filter(r => r.pathFound).map(r => ({ name: r.name, value: r.pathCost }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="value" name="Path Cost" radius={[4, 4, 0, 0]}>
                        {currentScenario.results.filter(r => r.pathFound).map(r => (
                          <rect key={r.name} fill={ALGORITHM_COLORS[r.name as AlgorithmName]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Algorithm Profile" icon={<Brain size={14} className="text-cyan-accent" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={getRadarData(currentScenario)}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={10} />
                      <PolarRadiusAxis stroke="#334155" fontSize={9} />
                      {currentScenario.results.filter(r => r.pathFound).map(r => (
                        <Radar
                          key={r.name}
                          name={r.name}
                          dataKey={r.name}
                          stroke={ALGORITHM_COLORS[r.name]}
                          fill={ALGORITHM_COLORS[r.name]}
                          fillOpacity={0.1}
                          strokeWidth={1.5}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Cross-scenario analysis */}
              {results.length > 1 && (
                <div className="bg-navy-800 border border-slate-border rounded-xl p-4">
                  <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                    <BarChart3 size={14} className="text-cyan-accent" />
                    Cross-Scenario Summary
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-navy-700/50">
                          <th className="px-3 py-2 text-left text-gray-400">Scenario</th>
                          {ALL_ALGORITHMS.map(name => (
                            <th key={name} className="px-3 py-2 text-center" style={{ color: ALGORITHM_COLORS[name] }}>{name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map(s => (
                          <tr key={s.scenarioName} className="border-t border-slate-border/30">
                            <td className="px-3 py-2 text-gray-300 font-medium">{s.scenarioName}</td>
                            {s.results.map(r => (
                              <td key={r.name} className="px-3 py-2 text-center">
                                {r.pathFound ? (
                                  <span className="text-gray-300">
                                    {r.pathCost}<span className="text-gray-600 ml-1">({r.nodesExpanded})</span>
                                  </span>
                                ) : (
                                  <span className="text-red-500">✗</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2">
                    Format: PathCost (NodesExpanded). ✗ = no path found.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-navy-800 border border-slate-border rounded-xl p-4 card-hover">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

function getRadarData(scenario: ScenarioBenchmarkResult) {
  const metrics = ['Nodes Expanded', 'Path Cost', 'Time (ms)', 'Peak Frontier', 'Path Length'];
  const maxValues: Record<string, number> = {};

  for (const metric of metrics) {
    let max = 0;
    for (const r of scenario.results) {
      if (!r.pathFound && metric !== 'Nodes Expanded' && metric !== 'Peak Frontier' && metric !== 'Time (ms)') continue;
      const val = getMetricValue(r, metric);
      if (val > max) max = val;
    }
    maxValues[metric] = max || 1;
  }

  return metrics.map(metric => {
    const entry: Record<string, string | number> = { metric };
    for (const r of scenario.results) {
      if (!r.pathFound && metric !== 'Nodes Expanded' && metric !== 'Peak Frontier' && metric !== 'Time (ms)') {
        entry[r.name] = 0;
      } else {
        entry[r.name] = Number(((getMetricValue(r, metric) / maxValues[metric]) * 100).toFixed(1));
      }
    }
    return entry;
  });
}

function getMetricValue(r: { nodesExpanded: number; pathCost: number; executionTimeMs: number; peakFrontierSize: number; path: { length: number } }, metric: string): number {
  switch (metric) {
    case 'Nodes Expanded': return r.nodesExpanded;
    case 'Path Cost': return r.pathCost;
    case 'Time (ms)': return r.executionTimeMs;
    case 'Peak Frontier': return r.peakFrontierSize;
    case 'Path Length': return r.path.length;
    default: return 0;
  }
}
