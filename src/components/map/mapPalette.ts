import { GraphAlgorithmName } from '../../algorithms/graph/types';

export interface AlgorithmStyle {
  stroke: string;
  glow: string;
  text: string;
  bg: string;
  border: string;
  offsetWidth: number;
  dash?: string;
}

export const ALGORITHM_PALETTE: Record<GraphAlgorithmName, AlgorithmStyle> = {
  Dijkstra: {
    stroke: '#06b6d4', // Cyan
    glow: 'rgba(6, 182, 212, 0.6)',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    offsetWidth: 5,
  },
  'A*': {
    stroke: '#10b981', // Emerald
    glow: 'rgba(16, 185, 129, 0.6)',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    offsetWidth: 4,
    dash: '8 2',
  },
  BFS: {
    stroke: '#3b82f6', // Electric Blue
    glow: 'rgba(59, 130, 246, 0.6)',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    offsetWidth: 3.5,
    dash: '4 3',
  },
  Greedy: {
    stroke: '#f59e0b', // Amber
    glow: 'rgba(245, 158, 11, 0.6)',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    offsetWidth: 3,
    dash: '12 4',
  },
  DFS: {
    stroke: '#ec4899', // Pink / Magenta
    glow: 'rgba(236, 72, 153, 0.6)',
    text: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/40',
    offsetWidth: 2.5,
    dash: '3 3',
  },
};
