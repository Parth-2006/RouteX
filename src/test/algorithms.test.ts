import { describe, it, expect } from 'vitest';
import { bfs } from '../algorithms/bfs';
import { dfs } from '../algorithms/dfs';
import { dijkstra } from '../algorithms/dijkstra';
import { astar } from '../algorithms/astar';
import { greedy } from '../algorithms/greedy';
import { createGrid, posEqual } from '../algorithms/grid';
import { Grid, CellType, AlgorithmResult, AlgorithmName } from '../algorithms/types';
import { runAllAlgorithms } from '../algorithms/benchmark';

// Helper: set wall on a grid
function setWall(grid: Grid, row: number, col: number) {
  grid.cells[row][col].type = CellType.Wall;
  grid.cells[row][col].weight = 1;
}

// Helper: set weighted cell
function setWeight(grid: Grid, row: number, col: number, weight: number) {
  grid.cells[row][col].type = CellType.Weighted;
  grid.cells[row][col].weight = weight;
}

// Helper: validate that a path is contiguous (each step is adjacent)
function isValidPath(path: { row: number; col: number }[]): boolean {
  for (let i = 1; i < path.length; i++) {
    const dr = Math.abs(path[i].row - path[i - 1].row);
    const dc = Math.abs(path[i].col - path[i - 1].col);
    if (dr + dc !== 1) return false;
  }
  return true;
}

// Helper: validate path doesn't go through walls
function pathAvoidsWalls(grid: Grid, path: { row: number; col: number }[]): boolean {
  return path.every(p => grid.cells[p.row][p.col].type !== CellType.Wall);
}

const allAlgos: { name: AlgorithmName; fn: (g: Grid) => AlgorithmResult }[] = [
  { name: 'BFS', fn: bfs },
  { name: 'DFS', fn: dfs },
  { name: 'Dijkstra', fn: dijkstra },
  { name: 'A*', fn: astar },
  { name: 'Greedy', fn: greedy },
];

describe('Algorithm Correctness', () => {
  describe('Open grid — all algorithms find a path', () => {
    const grid = createGrid(10, 10, { row: 0, col: 0 }, { row: 9, col: 9 });

    for (const { name, fn } of allAlgos) {
      it(`${name} finds a valid path on open grid`, () => {
        const result = fn(grid);
        expect(result.pathFound).toBe(true);
        expect(result.path.length).toBeGreaterThan(0);
        expect(posEqual(result.path[0], grid.start)).toBe(true);
        expect(posEqual(result.path[result.path.length - 1], grid.end)).toBe(true);
        expect(isValidPath(result.path)).toBe(true);
        expect(result.nodesExpanded).toBeGreaterThan(0);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.name).toBe(name);
      });
    }
  });

  describe('Start equals destination', () => {
    const grid = createGrid(5, 5, { row: 2, col: 2 }, { row: 2, col: 2 });

    for (const { name, fn } of allAlgos) {
      it(`${name} handles start === end`, () => {
        const result = fn(grid);
        expect(result.pathFound).toBe(true);
        expect(result.path.length).toBe(1);
        expect(posEqual(result.path[0], grid.start)).toBe(true);
        expect(result.pathCost).toBe(0);
      });
    }
  });

  describe('Unreachable destination', () => {
    // Surround the end with walls
    const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 4, col: 4 });
    setWall(grid, 3, 4);
    setWall(grid, 4, 3);
    setWall(grid, 3, 3);

    for (const { name, fn } of allAlgos) {
      it(`${name} returns pathFound=false when destination is unreachable`, () => {
        const result = fn(grid);
        expect(result.pathFound).toBe(false);
        expect(result.path.length).toBe(0);
        expect(result.pathCost).toBe(0);
      });
    }
  });

  describe('Path avoids walls', () => {
    const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 4, col: 4 });
    // Add some walls
    setWall(grid, 1, 1);
    setWall(grid, 2, 2);
    setWall(grid, 3, 3);

    for (const { name, fn } of allAlgos) {
      it(`${name} path does not pass through walls`, () => {
        const result = fn(grid);
        if (result.pathFound) {
          expect(pathAvoidsWalls(grid, result.path)).toBe(true);
          expect(isValidPath(result.path)).toBe(true);
        }
      });
    }
  });

  describe('BFS optimality on unweighted grid', () => {
    it('BFS finds shortest path (fewest steps) on unweighted grid', () => {
      const grid = createGrid(10, 10, { row: 0, col: 0 }, { row: 9, col: 9 });
      const result = bfs(grid);
      // Manhattan distance for 10x10 grid: 9+9=18 steps, path length = 19 cells
      expect(result.pathFound).toBe(true);
      expect(result.path.length).toBe(19); // 18 moves + start = 19 cells
      expect(result.guaranteesOptimal).toBe(true);
    });
  });

  describe('DFS does NOT guarantee optimal', () => {
    it('DFS marks guaranteesOptimal as false', () => {
      const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 4, col: 4 });
      const result = dfs(grid);
      expect(result.guaranteesOptimal).toBe(false);
      expect(result.pathFound).toBe(true);
    });
  });

  describe('Greedy does NOT guarantee optimal', () => {
    it('Greedy marks guaranteesOptimal as false', () => {
      const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 4, col: 4 });
      const result = greedy(grid);
      expect(result.guaranteesOptimal).toBe(false);
      expect(result.pathFound).toBe(true);
    });
  });

  describe('Weighted grid — Dijkstra and A* find minimum-cost path', () => {
    it('Dijkstra finds minimum-cost path', () => {
      // Create a grid where the direct path is expensive but a detour is cheaper
      const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 0, col: 4 });
      // Make the direct path (row 0) expensive
      setWeight(grid, 0, 1, 10);
      setWeight(grid, 0, 2, 10);
      setWeight(grid, 0, 3, 10);
      // Leave row 1 and row 2 cheap (weight 1)

      const result = dijkstra(grid);
      expect(result.pathFound).toBe(true);
      expect(result.guaranteesOptimal).toBe(true);
      // The optimal path should detour around the expensive cells
      // Cost via row 0: 10+10+10 = 30
      // Cost via detour: go down, across, up: 1+1+1+1+1+1+1+1 = 8
      expect(result.pathCost).toBeLessThan(30);
    });

    it('A* finds minimum-cost path on weighted grid', () => {
      const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 0, col: 4 });
      setWeight(grid, 0, 1, 10);
      setWeight(grid, 0, 2, 10);
      setWeight(grid, 0, 3, 10);

      const astarResult = astar(grid);
      const dijkstraResult = dijkstra(grid);

      expect(astarResult.pathFound).toBe(true);
      expect(astarResult.guaranteesOptimal).toBe(true);
      // A* should find the same cost as Dijkstra
      expect(astarResult.pathCost).toBe(dijkstraResult.pathCost);
    });
  });

  describe('All five algorithms execute and produce valid results', () => {
    it('runAllAlgorithms returns results for all 5 algorithms', () => {
      const grid = createGrid(10, 10, { row: 0, col: 0 }, { row: 9, col: 9 });
      const results = runAllAlgorithms(grid);
      expect(results.length).toBe(5);

      const names = results.map(r => r.name);
      expect(names).toContain('BFS');
      expect(names).toContain('DFS');
      expect(names).toContain('Dijkstra');
      expect(names).toContain('A*');
      expect(names).toContain('Greedy');

      for (const r of results) {
        expect(r.pathFound).toBe(true);
        expect(r.path.length).toBeGreaterThan(0);
        expect(isValidPath(r.path)).toBe(true);
      }
    });
  });

  describe('Path cost calculations', () => {
    it('Path cost is 0 when start === end', () => {
      const grid = createGrid(5, 5, { row: 2, col: 2 }, { row: 2, col: 2 });
      for (const { fn } of allAlgos) {
        const result = fn(grid);
        expect(result.pathCost).toBe(0);
      }
    });

    it('Path cost equals path length - 1 on unweighted grid (BFS)', () => {
      const grid = createGrid(5, 5, { row: 0, col: 0 }, { row: 4, col: 4 });
      const result = bfs(grid);
      expect(result.pathCost).toBe(result.path.length - 1);
    });
  });

  describe('Metrics are correctly recorded', () => {
    for (const { name, fn } of allAlgos) {
      it(`${name} records non-negative metrics`, () => {
        const grid = createGrid(8, 8, { row: 0, col: 0 }, { row: 7, col: 7 });
        const result = fn(grid);
        expect(result.nodesExpanded).toBeGreaterThanOrEqual(0);
        expect(result.nodesDiscovered).toBeGreaterThanOrEqual(0);
        expect(result.peakFrontierSize).toBeGreaterThanOrEqual(0);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.visitedOrder.length).toBe(result.nodesExpanded);
      });
    }
  });

  describe('Optimality guarantees are correctly labeled', () => {
    it('BFS, Dijkstra, and A* guarantee optimality', () => {
      const grid = createGrid(5, 5);
      expect(bfs(grid).guaranteesOptimal).toBe(true);
      expect(dijkstra(grid).guaranteesOptimal).toBe(true);
      expect(astar(grid).guaranteesOptimal).toBe(true);
    });

    it('DFS and Greedy do NOT guarantee optimality', () => {
      const grid = createGrid(5, 5);
      expect(dfs(grid).guaranteesOptimal).toBe(false);
      expect(greedy(grid).guaranteesOptimal).toBe(false);
    });
  });
});
