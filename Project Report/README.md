# RouteX — Comprehensive Project Report Deliverables

This directory contains the formal academic project report / thesis dossier for the **RouteX: Analysis of Algorithms** course submission.

## 📁 Included Deliverables

1. **`RouteX_Comprehensive_Project_Report.html`**: A publication-grade, print-ready academic project report dossier formatted in HTML/CSS with standard academic typography, formal cover sheet, certificate of originality, executive abstract, table of contents, numbered chapters, math equation blocks, data tables, callouts, and references. Includes a floating **"Print Full Report / Save PDF"** button pre-styled for A4 portrait printing (`@page { size: A4; margin: 2.5cm; }`).
2. **`RouteX_Comprehensive_Project_Report.md`**: The complete markdown manuscript version of the project report for reading on GitHub, Notion, VS Code, or compiling via Pandoc.

## 📑 Report Structure & Chapter Outline

- **Front Matter**: Formal Title Page, Certificate of Originality & Declaration, Acknowledgements, and Executive Abstract.
- **Chapter 1: Introduction**: Background & Context, Problem Statement, Project Objectives, Scope & System Boundaries.
- **Chapter 2: Theoretical Foundations**: Graph Theory Terminology, Uninformed Search (BFS, DFS), Informed Search (Dijkstra, A*, Greedy), and the Asymptotic Complexity Matrix.
- **Chapter 3: Mathematical Formulations & Proofs**: Spherical Earth Geodesic Haversine Formula, Mathematical Proof of A* Admissibility ($h(n) \le d^*(n)$), and Mathematical Proof of A* Consistency (Monotonicity) via Triangle Inequality.
- **Chapter 4: System Architecture & Cartographic Modeling**: Modular Architecture, 100+ Node Procedural Metropolis Simulation, Quadratic Bezier Road Curvature, and Real-World OSM Extracts (London, Manhattan, Mumbai).
- **Chapter 5: Implementation Details**: Binary Min-Heap Priority Queue ($\mathcal{O}(\log V)$), Search Frame Tracer Engine, and Hardware-Accelerated Full-Screen SVG Visualizer.
- **Chapter 6: Empirical Results & Comparative Analysis**: Cross-Metropolis Benchmarks, Execution Latency Analysis, Node Expansion & Pruning Ratio (57.6% search reduction), Hop-Optimality vs. Distance-Optimality, and Greedy Trap Vulnerability.
- **Chapter 7: Testing & Quality Assurance**: Vitest Automated Regression Test Suite (76 passing tests), TypeScript Compiler Check, Oxlint Linter Verification, and Vite Production Bundle.
- **Chapter 8: Conclusion & Future Scope**: Summary of Contributions and Future Extensions (Bidirectional A*, Contraction Hierarchies, Dynamic Traffic Weights).
- **References**: Formal IEEE bibliography [1]–[7].
- **Appendix**: Local Setup & Execution Guide.

## 🖨️ Printing & PDF Export Instructions

Open `RouteX_Comprehensive_Project_Report.html` in Chrome/Edge, click the floating **"Print Full Report / Save PDF"** button (or press `Ctrl + P`), select **Save as PDF**, set Destination to PDF, Paper size to **A4**, and ensure **"Background graphics"** is checked.
