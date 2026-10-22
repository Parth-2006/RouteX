import { Grid, CellType, ScenarioConfig } from './types';
import { createGrid, seededRandom } from './grid';

/** Generate an open grid with no obstacles */
function generateOpenGrid(rows: number, cols: number, _seed: number): Grid {
  return createGrid(rows, cols, { row: 0, col: 0 }, { row: rows - 1, col: cols - 1 });
}

/** Generate a grid with random obstacles (~25% density) */
function generateRandomObstacles(rows: number, cols: number, seed: number): Grid {
  const grid = createGrid(rows, cols, { row: 0, col: 0 }, { row: rows - 1, col: cols - 1 });
  const rand = seededRandom(seed);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
      if (rand() < 0.25) {
        grid.cells[r][c].type = CellType.Wall;
      }
    }
  }
  return grid;
}

/** Generate a grid with dense obstacles (~40% density) */
function generateDenseObstacles(rows: number, cols: number, seed: number): Grid {
  const grid = createGrid(rows, cols, { row: 0, col: 0 }, { row: rows - 1, col: cols - 1 });
  const rand = seededRandom(seed);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
      if (rand() < 0.40) {
        grid.cells[r][c].type = CellType.Wall;
      }
    }
  }
  return grid;
}

/** Generate a maze-like grid using recursive division (simplified) */
function generateMaze(rows: number, cols: number, seed: number): Grid {
  const grid = createGrid(rows, cols, { row: 0, col: 0 }, { row: rows - 1, col: cols - 1 });
  const rand = seededRandom(seed);

  // Fill everything with walls first
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.cells[r][c].type = CellType.Wall;
    }
  }

  // Carve passages using randomized DFS
  const visited = new Set<string>();
  const stack: [number, number][] = [[0, 0]];
  visited.add('0,0');
  grid.cells[0][0].type = CellType.Empty;

  const dirs: [number, number][] = [[0, 2], [2, 0], [0, -2], [-2, 0]];

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];

    // Shuffle directions
    const shuffled = [...dirs].sort(() => rand() - 0.5);
    let moved = false;

    for (const [dr, dc] of shuffled) {
      const nr = cr + dr;
      const nc = cc + dc;
      const key = `${nr},${nc}`;

      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key)) {
        visited.add(key);
        // Carve the wall between current and next
        grid.cells[cr + dr / 2][cc + dc / 2].type = CellType.Empty;
        grid.cells[nr][nc].type = CellType.Empty;
        stack.push([nr, nc]);
        moved = true;
        break;
      }
    }

    if (!moved) {
      stack.pop();
    }
  }

  // Ensure start and end are open
  grid.cells[0][0].type = CellType.Empty;
  grid.cells[rows - 1][cols - 1].type = CellType.Empty;

  return grid;
}

/** Generate a grid with weighted terrain */
function generateWeightedTerrain(rows: number, cols: number, seed: number): Grid {
  const grid = createGrid(rows, cols, { row: 0, col: 0 }, { row: rows - 1, col: cols - 1 });
  const rand = seededRandom(seed);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
      const rv = rand();
      if (rv < 0.10) {
        grid.cells[r][c].type = CellType.Wall;
      } else if (rv < 0.35) {
        grid.cells[r][c].type = CellType.Weighted;
        grid.cells[r][c].weight = Math.floor(rand() * 8) + 3; // weight 3-10
      }
    }
  }
  return grid;
}

/** Pre-defined benchmark scenarios */
export const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'Open Grid (20×20)',
    description: 'No obstacles — tests raw algorithm efficiency',
    gridRows: 20,
    gridCols: 20,
    generator: generateOpenGrid,
    seed: 42,
  },
  {
    name: 'Random Obstacles (20×20)',
    description: '~25% random walls — moderate difficulty',
    gridRows: 20,
    gridCols: 20,
    generator: generateRandomObstacles,
    seed: 42,
  },
  {
    name: 'Dense Obstacles (20×20)',
    description: '~40% random walls — high difficulty, path may not exist',
    gridRows: 20,
    gridCols: 20,
    generator: generateDenseObstacles,
    seed: 42,
  },
  {
    name: 'Maze (21×21)',
    description: 'Carved maze — tests narrow-passage navigation',
    gridRows: 21,
    gridCols: 21,
    generator: generateMaze,
    seed: 42,
  },
  {
    name: 'Weighted Terrain (20×20)',
    description: 'Mixed weights (3-10) + some walls — shows cost-aware vs. unaware',
    gridRows: 20,
    gridCols: 20,
    generator: generateWeightedTerrain,
    seed: 42,
  },
  {
    name: 'Open Grid (40×40)',
    description: 'Larger open grid — tests scaling behavior',
    gridRows: 40,
    gridCols: 40,
    generator: generateOpenGrid,
    seed: 42,
  },
  {
    name: 'Random Obstacles (40×40)',
    description: 'Larger grid with ~25% walls — scaling under constraints',
    gridRows: 40,
    gridCols: 40,
    generator: generateRandomObstacles,
    seed: 42,
  },
  {
    name: 'Weighted Terrain (40×40)',
    description: 'Larger weighted grid — cost-aware algorithm advantage',
    gridRows: 40,
    gridCols: 40,
    generator: generateWeightedTerrain,
    seed: 42,
  },
];

export { generateOpenGrid, generateRandomObstacles, generateDenseObstacles, generateMaze, generateWeightedTerrain };
