import { Grid, AlgorithmResult, AlgorithmName, ScenarioBenchmarkResult } from './types';
import { cloneGrid } from './grid';
import { bfs } from './bfs';
import { dfs } from './dfs';
import { dijkstra } from './dijkstra';
import { astar } from './astar';
import { greedy } from './greedy';
import { SCENARIOS } from './scenarios';

/** Map algorithm names to their implementations */
const ALGORITHM_MAP: Record<AlgorithmName, (grid: Grid) => AlgorithmResult> = {
  'BFS': bfs,
  'DFS': dfs,
  'Dijkstra': dijkstra,
  'A*': astar,
  'Greedy': greedy,
};

export const ALL_ALGORITHMS: AlgorithmName[] = ['BFS', 'DFS', 'Dijkstra', 'A*', 'Greedy'];

/**
 * Run a single algorithm on a grid, measuring execution time.
 * Returns results with timing from performance.now().
 */
export function runAlgorithm(name: AlgorithmName, grid: Grid): AlgorithmResult {
  const gridCopy = cloneGrid(grid);
  const fn = ALGORITHM_MAP[name];
  return fn(gridCopy);
}

/**
 * Run all algorithms on the same grid for fair comparison.
 * Each algorithm gets an independent clone of the grid.
 */
export function runAllAlgorithms(grid: Grid): AlgorithmResult[] {
  return ALL_ALGORITHMS.map(name => runAlgorithm(name, grid));
}

/**
 * Run a benchmark: execute each algorithm multiple times and report median.
 * Uses performance.now() for timing. Excludes rendering/animation time.
 */
export function benchmarkAlgorithm(
  name: AlgorithmName,
  grid: Grid,
  iterations: number = 5
): AlgorithmResult {
  const results: AlgorithmResult[] = [];
  for (let i = 0; i < iterations; i++) {
    results.push(runAlgorithm(name, grid));
  }

  // Sort by execution time and pick median
  results.sort((a, b) => a.executionTimeMs - b.executionTimeMs);
  const median = results[Math.floor(results.length / 2)];
  return median;
}

/**
 * Run benchmarks for all algorithms on a single grid.
 */
export function benchmarkAllAlgorithms(
  grid: Grid,
  iterations: number = 5
): AlgorithmResult[] {
  return ALL_ALGORITHMS.map(name => benchmarkAlgorithm(name, grid, iterations));
}

/**
 * Run benchmarks across all predefined scenarios.
 */
export function runFullBenchmark(iterations: number = 5): ScenarioBenchmarkResult[] {
  return SCENARIOS.map(scenario => {
    const grid = scenario.generator(scenario.gridRows, scenario.gridCols, scenario.seed);
    const results = benchmarkAllAlgorithms(grid, iterations);
    return {
      scenarioName: scenario.name,
      scenarioDescription: scenario.description,
      gridSize: `${scenario.gridRows}×${scenario.gridCols}`,
      results,
    };
  });
}

/**
 * Export benchmark results as CSV string.
 */
export function exportToCSV(benchmarkResults: ScenarioBenchmarkResult[]): string {
  const headers = [
    'Scenario',
    'Grid Size',
    'Algorithm',
    'Path Found',
    'Path Length',
    'Path Cost',
    'Nodes Expanded',
    'Nodes Discovered',
    'Peak Frontier Size',
    'Execution Time (ms)',
    'Guarantees Optimal',
  ];

  const rows: string[] = [headers.join(',')];

  for (const scenario of benchmarkResults) {
    for (const result of scenario.results) {
      rows.push([
        `"${scenario.scenarioName}"`,
        `"${scenario.gridSize}"`,
        result.name,
        result.pathFound,
        result.path.length,
        result.pathCost,
        result.nodesExpanded,
        result.nodesDiscovered,
        result.peakFrontierSize,
        result.executionTimeMs.toFixed(3),
        result.guaranteesOptimal,
      ].join(','));
    }
  }

  return rows.join('\n');
}
