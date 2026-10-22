# RouteX — Analysis & Comparative Benchmarking of Route Planning Algorithms

> **Academic Project — Analysis of Algorithms (AOA)**  
> Built with **React 19, TypeScript, Vite, Tailwind CSS, Leaflet / OpenStreetMap, Recharts, and Vitest**.  
> Pure client-side execution — **100% free, zero paid APIs, zero backend requirements**.

---

## 📌 Executive Summary

**RouteX** is an interactive, academic-grade laboratory designed to evaluate, benchmark, and visualize the five fundamental graph traversal and shortest-path algorithms:
1. **Breadth-First Search (BFS)**
2. **Depth-First Search (DFS)**
3. **Dijkstra’s Algorithm**
4. **A* Search (A-Star)**
5. **Greedy Best-First Search**

The platform evaluates these algorithms across two distinct domains:
1. **Interactive 2D Grid Visualizer**: Step-by-step frontier exploration, customizable obstacles, and weighted terrains (swamps, mud, forests) with Euclidean and Manhattan metrics.
2. **Real-World Road Network Comparison**: Execution on authentic OpenStreetMap (OSM) drivable road networks with real street geometry, one-way road restrictions, and accurate geodesic Haversine distance calculations.

---

## 🧠 Algorithmic Foundations & Complexity

| Algorithm | Optimization Objective | Data Structure | Time Complexity | Space Complexity | Optimality Guarantee | Heuristic Used |
|---|---|---|---|---|---|---|
| **BFS** | Fewest Edge Hops | FIFO Queue | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Optimal for unweighted / unit-cost edges** | None (Blind search) |
| **DFS** | Deepest Path First | LIFO Stack / Recursion | $\mathcal{O}(V + E)$ | $\mathcal{O}(V)$ | **Non-optimal** (Arbitrary valid path) | None (Blind search) |
| **Dijkstra** | Minimal Path Distance | Min-Priority Queue | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V)$ | **Provably optimal** (Non-negative weights) | None ($g(n)$ only) |
| **A\*** | Minimal Path Distance | Min-Priority Queue | $\mathcal{O}(E)$ best / $\mathcal{O}(V \log V)$ | $\mathcal{O}(V)$ | **Provably optimal** (Admissible heuristic) | $f(n) = g(n) + h(n)$ (Haversine) |
| **Greedy BFS** | Greedy Progress to Target | Min-Priority Queue | $\mathcal{O}(V \log V)$ worst | $\mathcal{O}(V)$ | **Non-optimal** (Can take large detours) | $f(n) = h(n)$ (Haversine) |

### Key Theoretical Takeaways for Viva & Reports
* **Dijkstra vs. A\***: Both yield the exact same mathematically optimal path distance. However, **A\* expands significantly fewer nodes (often 40%–60% fewer)** by pruning the search space towards the destination using an admissible Haversine heuristic ($h(n) \le d^*(n)$).
* **BFS vs. Dijkstra on Road Networks**: BFS guarantees the path with the **minimum number of intersections/turns (edge hops)**, but this is **not** necessarily the shortest geographic distance. An avenue route with 4 long segments may be $3.5\text{ km}$, while a local street route with 6 short segments may be $2.4\text{ km}$. Dijkstra picks the $2.4\text{ km}$ route; BFS picks the 4-hop route.
* **Greedy Best-First vs. A\***: Greedy prioritizes only estimated distance remaining $h(n)$, completely ignoring accumulated travel cost $g(n)$. While fast, it frequently commits to dead-ends or long detours when obstacles (bays, rivers, parks, one-way streets) block the straight-line heading.
* **DFS Behavior**: DFS dives down one valid street branch until it hits a dead-end or the goal. It demonstrates how unrestricted exploration without priority metrics produces winding, non-optimal paths.

---

## ⚖️ System Limitations & Engineering Trade-Offs
*(Refer to this section for project reports, viva defense, and explaining design choices to professors)*

Every computer science project makes deliberate engineering trade-offs. The limitations below are **not defects**, but **fundamental architectural decisions** required to run pure, transparent algorithm comparisons inside a client-side browser:

### 1. Client-Side Browser Memory vs. Planetary Routing Graphs
* **The Reality**: The global OpenStreetMap road network contains over **1 billion nodes** and requires tens of gigabytes of RAM. Production navigation systems (e.g., Google Maps, Apple Maps) run on massive distributed server clusters with preprocessed routing indexes.
* **RouteX Design Choice**: RouteX runs **entirely in the user’s web browser (single-threaded JavaScript event loop)**. To avoid browser memory crashes, heap exhaustion, and freezing the UI, RouteX operates on **bounded metropolitan sub-graphs** ($\sim 30$ to $1{,}000$ nodes).
* **Academic Value**: This keeps the algorithm execution completely transparent and pure. Every student can inspect the exact node expansions, edge traversals, and execution times down to fractions of a millisecond without hidden server pre-processing.

### 2. Public Overpass API Rate Limits & The Necessity of Pre-Extracted Networks
* **The Reality**: OpenStreetMap’s public Overpass API is a free, volunteer-funded community service. In 2024–2026, public Overpass mirrors enforce **strict rate-limiting (`HTTP 429`)**, timeout limits ($10\text{s}$–$20\text{s}$), and frequently return `HTTP 406 / 504` during peak hours.
* **RouteX Solution**: RouteX implements a dual-architecture:
  1. **Deterministic Pre-Extracted Urban Extracts**: Built-in, high-fidelity real OpenStreetMap extracts for **Central London**, **Manhattan Grid**, and **Mumbai Metropolitan Corridor**. These run **100% offline, locally, and instantly**, guaranteeing that exams, demonstrations, and grading never fail due to external network outages.
  2. **Live Overpass Extraction (Adaptive)**: For custom worldwide queries, RouteX sends targeted queries with short timeouts ($7\text{s}$) and automatic mirror fallbacks. If public mirrors are rate-limited, RouteX honestly reports the public service constraint and directs the user to the built-in metropolitan networks.

### 3. Coordinate Snapping Thresholds & Resolution
* **The Reality**: A user can click or search any arbitrary latitude/longitude coordinate (e.g., in the middle of a park, ocean, building, or pedestrian zone). Road algorithms can only route along **drivable road graph edges**.
* **RouteX Solution**:
  * Coordinates are snapped to the nearest road-network intersection using the geodesic Haversine metric.
  * A strict threshold ($3{,}000\text{ m}$) prevents snapping points across distant cities.
  * If two selected locations are virtually identical ($< 25\text{ m}$ apart) or snap to the same intersection node, RouteX alerts the user to select distinct locations rather than reporting a misleading $0\text{ m}$ route.

### 4. Pure Algorithmic Distance vs. Real-World Traffic & Turn Penalties
* **The Reality**: Real-world navigation engines (e.g., Google Maps, OSRM) calculate travel time using real-time GPS probe traffic, live congestion, traffic signal cycle delays, turn restrictions (e.g., no right turn), and vehicle speed limits.
* **RouteX Academic Focus**: Edge costs in RouteX are strictly defined as **physical geodesic road distances in meters** ($\sum \text{Haversine}$). 
* **Why This Matters**: Introducing proprietary traffic coefficients or variable speed multipliers would obfuscate pure algorithm behavior. In RouteX, Dijkstra and A* minimize physical road distance; BFS minimizes edge count. This provides an unbiased, mathematically verifiable benchmark directly aligned with college algorithm curricula.

### 5. Educational Pure Search vs. Pre-Calculated Contraction Hierarchies (OSRM)
* **OSRM Reference Role**: RouteX displays an optional **OSRM driving route** purely as a visually distinct external reference line (dashed slate polyline). OSRM uses **Contraction Hierarchies (CH)**—a pre-processed graph shortcut technique that computes queries in $< 5\text{ ms}$ on large graphs.
* **Pure AOA Comparison**: RouteX **never** copies or labels OSRM output as algorithm output. The five algorithms (BFS, DFS, Dijkstra, A*, Greedy) independently traverse the exact same immutable graph snapshot in real time, recording exact node expansions and execution times.

---

## 🛠️ Tech Stack & Architecture

* **Frontend Framework**: React 19 + TypeScript 5
* **Build System & Dev Server**: Vite 8 (Hot Module Replacement, optimized tree-shaking)
* **Styling & UI**: Tailwind CSS (Dark slate/navy theme, cyan/emerald accents, glassmorphic cards)
* **Interactive Mapping**: Leaflet 1.9 + React-Leaflet (Custom markers, road polylines, auto-fit view)
* **Charts & Visualizations**: Recharts (Nodes expanded, execution time, path distance bar charts)
* **Icons**: Lucide React
* **Unit & Regression Testing**: Vitest (61 deterministic regression tests)
* **Linting**: Oxlint

---

## 📁 Repository Structure

```
RouteX/
├── public/                     # Static assets (favicons, icons)
├── src/
│   ├── algorithms/
│   │   ├── 2d/                 # 2D Grid Algorithms (BFS, DFS, Dijkstra, A*, Greedy)
│   │   ├── graph/              # Real-World Road Network Graph Engine
│   │   │   ├── types.ts              # RoadNode, RoadEdge, GraphAlgorithmResult types
│   │   │   ├── haversine.ts          # Exact great-circle geodesic calculations
│   │   │   ├── roadGraphParser.ts    # Overpass OSM parser & nearest-node snapping
│   │   │   ├── searchAlgorithms.ts   # Road graph BFS, DFS, Dijkstra, A*, Greedy
│   │   │   ├── sampleRoadGraphs.ts   # Pre-extracted London, Manhattan, Mumbai networks
│   │   │   ├── overpassService.ts    # Live Overpass mirror client & cache
│   │   │   └── index.ts              # Public graph module exports
│   │   ├── benchmark.ts        # Automated scenario benchmarking & CSV exporter
│   │   └── priorityQueue.ts    # Binary Min-Heap Priority Queue (O(log N))
│   ├── components/             # Navigation bar, common cards, layouts
│   ├── pages/
│   │   ├── MapDemo.tsx         # Real Road Network Algorithm Comparison Map
│   │   ├── Visualizer.tsx      # Interactive 2D Grid Visualizer (Mazes & Terrains)
│   │   ├── Dashboard.tsx       # Comprehensive Performance Benchmark Dashboard
│   │   └── Guide.tsx           # Academic Algorithm Guide & Mathematical Formulas
│   ├── test/
│   │   ├── algorithms.test.ts  # 35 unit tests for 2D grid algorithms
│   │   └── roadGraph.test.ts   # 26 regression tests for road graph engine
│   ├── App.tsx                 # Client routing & layout wrapper
│   ├── main.tsx                # React entrypoint
│   └── index.css               # Design tokens & Tailwind utilities
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite configuration
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Git**: Installed and configured

### 1. Installation
```bash
git clone https://github.com/YOUR_USERNAME/RouteX.git
cd RouteX
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Tests
```bash
npm test
```
Executes all **61 deterministic unit and regression tests** using Vitest.

### 4. Run Code Quality Checks
```bash
npm run lint         # Runs Oxlint (0 warnings, 0 errors)
npm run typecheck    # Runs TypeScript compiler check (0 errors)
```

### 5. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` folder.

---

## 📤 Uploading to GitHub / Creating a New Git Repository

Follow these step-by-step commands to push RouteX to your personal GitHub account:

### Step 1: Initialize Git in your project folder
Open a terminal in the project directory:
```bash
git init
git add .
git commit -m "feat: complete RouteX algorithm comparison platform with OSM road networks"
```

### Step 2: Create a new repository on GitHub
1. Go to [GitHub.com](https://github.com) and log in.
2. Click the **`+`** icon in the top-right corner and select **New repository**.
3. Name your repository: `RouteX` (or `RouteX-AOA-Algorithms`).
4. Set visibility to **Public** (or **Private** as desired).
5. **Do NOT** check "Add a README file" or ".gitignore" (we already have them).
6. Click **Create repository**.

### Step 3: Link and push your local code
Copy the commands shown on GitHub under **"…or push an existing repository from the command line"**:
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/RouteX.git
git push -u origin main
```
*(Replace `YOUR_USERNAME` with your actual GitHub username).*

---

## 🎓 Academic Presentation & Viva Checklist

When explaining this project to your examiner or professor:
1. **Open the 2D Visualizer**:
   - Place a diagonal wall or swamp terrain between Start and Target.
   - Run **Dijkstra** (expands uniformly in all directions).
   - Run **A\*** (focuses directly towards target; show that node expansions are cut in half).
   - Run **Greedy** (rushes straight into the wall before backtracking).
2. **Open the Real Road Network Map (`/map`)**:
   - Select **Central London** (Hyde Park to Bank) or **Mumbai** (D Ward to B Ward).
   - Click **Compare All 5 Algorithms**.
   - Point out that **Dijkstra and A\* produce the exact same optimal distance**, but A* expanded significantly fewer intersections.
   - Point out that **BFS minimized edge hops**, demonstrating the edge-count vs. distance trade-off.
   - Click **Export CSV** to download the exact metrics table for your report.
3. **Discuss Limitations Confidently**:
   - Explain why in-browser client execution requires bounding boxes rather than loading whole continents.
   - Explain why public Overpass mirrors require offline pre-extracted fallbacks.
   - Explain that road distances are pure physical edge lengths to keep the AOA algorithmic comparison unbiased and verifiable.

---

## 📄 License
This project is open-source and created for academic, educational, and research purposes. Feel free to reference, cite, or extend it for academic coursework.
