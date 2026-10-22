import { AlgorithmName } from '../algorithms/types';

/** Consistent algorithm colors for charts and visualization */
export const ALGORITHM_COLORS: Record<AlgorithmName, string> = {
  'BFS': '#3b82f6',      // blue
  'DFS': '#ef4444',      // red
  'Dijkstra': '#22c55e', // green
  'A*': '#f59e0b',       // amber
  'Greedy': '#a855f7',   // purple
};

/** Format number with appropriate precision */
export function formatNumber(n: number, decimals: number = 2): string {
  if (n === 0) return '0';
  if (n < 0.01) return n.toExponential(1);
  return n.toFixed(decimals);
}

/** Format time in ms */
export function formatTime(ms: number): string {
  if (ms < 0.01) return '<0.01 ms';
  if (ms < 1) return `${formatNumber(ms, 3)} ms`;
  if (ms < 1000) return `${formatNumber(ms, 2)} ms`;
  return `${formatNumber(ms / 1000, 2)} s`;
}

/** Download text content as a file */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
