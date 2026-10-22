import { Grid, Cell, CellType, Position, DIRECTIONS } from './types';

/** Create an empty grid */
export function createGrid(rows: number, cols: number, start?: Position, end?: Position): Grid {
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      cells[r][c] = {
        pos: { row: r, col: c },
        type: CellType.Empty,
        weight: 1,
      };
    }
  }
  return {
    rows,
    cols,
    cells,
    start: start ?? { row: 0, col: 0 },
    end: end ?? { row: rows - 1, col: cols - 1 },
  };
}

/** Check if a position is within the grid bounds */
export function isInBounds(grid: Grid, pos: Position): boolean {
  return pos.row >= 0 && pos.row < grid.rows && pos.col >= 0 && pos.col < grid.cols;
}

/** Check if a position is walkable (not a wall) */
export function isWalkable(grid: Grid, pos: Position): boolean {
  return isInBounds(grid, pos) && grid.cells[pos.row][pos.col].type !== CellType.Wall;
}

/** Get valid neighbors of a position (4-directional) */
export function getNeighbors(grid: Grid, pos: Position): Position[] {
  const neighbors: Position[] = [];
  for (const dir of DIRECTIONS) {
    const next: Position = { row: pos.row + dir.row, col: pos.col + dir.col };
    if (isWalkable(grid, next)) {
      neighbors.push(next);
    }
  }
  return neighbors;
}

/** Get the movement cost to enter a cell */
export function getMoveCost(grid: Grid, pos: Position): number {
  return grid.cells[pos.row][pos.col].weight;
}

/** Encode a position as a unique string key */
export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

/** Check if two positions are equal */
export function posEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Manhattan distance heuristic (admissible for 4-directional grid) */
export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Reconstruct path from parent map */
export function reconstructPath(
  parentMap: Map<string, Position | null>,
  end: Position
): Position[] {
  const path: Position[] = [];
  let current: Position | null | undefined = end;
  const key = posKey(end);
  if (!parentMap.has(key)) return [];

  while (current != null) {
    path.push(current);
    const parentPos = parentMap.get(posKey(current));
    current = parentPos === undefined ? null : parentPos;
  }
  path.reverse();
  return path;
}

/** Calculate the total cost of a path on the grid */
export function calculatePathCost(grid: Grid, path: Position[]): number {
  if (path.length <= 1) return 0;
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    cost += getMoveCost(grid, path[i]);
  }
  return cost;
}

/** Simple seeded pseudo-random number generator (mulberry32) */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deep-clone a grid */
export function cloneGrid(grid: Grid): Grid {
  const cells: Cell[][] = grid.cells.map(row =>
    row.map(cell => ({ ...cell, pos: { ...cell.pos } }))
  );
  return {
    rows: grid.rows,
    cols: grid.cols,
    cells,
    start: { ...grid.start },
    end: { ...grid.end },
  };
}
