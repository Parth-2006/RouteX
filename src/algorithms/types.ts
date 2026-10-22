/** Position on the grid */
export interface Position {
  row: number;
  col: number;
}

/** Cell types in the grid */
export enum CellType {
  Empty = 0,
  Wall = 1,
  Weighted = 2,
}

/** A single cell in the grid */
export interface Cell {
  pos: Position;
  type: CellType;
  weight: number; // 1 for empty, higher for weighted terrain
}

/** The grid graph used by all algorithms */
export interface Grid {
  rows: number;
  cols: number;
  cells: Cell[][];
  start: Position;
  end: Position;
}

/** Result returned by an algorithm execution */
export interface AlgorithmResult {
  name: AlgorithmName;
  pathFound: boolean;
  path: Position[];
  pathCost: number;
  nodesExpanded: number;
  nodesDiscovered: number;
  peakFrontierSize: number;
  executionTimeMs: number;
  visitedOrder: Position[]; // Order in which nodes were expanded (for visualization)
  guaranteesOptimal: boolean;
}

/** Supported algorithm names */
export type AlgorithmName = 'BFS' | 'DFS' | 'Dijkstra' | 'A*' | 'Greedy';

/** Direction vectors for 4-directional movement */
export const DIRECTIONS: Position[] = [
  { row: -1, col: 0 }, // up
  { row: 0, col: 1 },  // right
  { row: 1, col: 0 },  // down
  { row: 0, col: -1 }, // left
];

/** Benchmark configuration */
export interface BenchmarkConfig {
  iterations: number; // Number of runs for median calculation
  scenarios: ScenarioConfig[];
}

/** A test scenario for benchmarking */
export interface ScenarioConfig {
  name: string;
  description: string;
  gridRows: number;
  gridCols: number;
  generator: (rows: number, cols: number, seed: number) => Grid;
  seed: number;
}

/** Full benchmark results for one scenario */
export interface ScenarioBenchmarkResult {
  scenarioName: string;
  scenarioDescription: string;
  gridSize: string;
  results: AlgorithmResult[];
}

/** Algorithm metadata for the guide */
export interface AlgorithmInfo {
  name: AlgorithmName;
  fullName: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  optimal: string;
  complete: string;
  usesWeights: boolean;
  usesHeuristic: boolean;
  dataStructure: string;
  pseudocode: string;
  useCases: string[];
  limitations: string[];
}
