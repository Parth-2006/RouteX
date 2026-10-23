# RouteX — IEEE Conference Paper Report Deliverables

This directory contains the IEEE-formatted research paper report for the **RouteX: Analysis of Algorithms** project submission.

## 📁 Included Deliverables

1. **`IEEE_Paper_RouteX.html`**: Publication-grade 2-column IEEE conference paper report in HTML/CSS with standard IEEE typography (Times New Roman serif, 10pt base, justified 2-column layout, Roman numeral section headings, equations, tables, figures, and IEEE-style references). Includes a floating **"Print / Save as PDF"** button for instant paper submission export.
2. **`IEEE_Paper_RouteX.tex`**: Complete, compilable LaTeX source code following standard `IEEEtran.cls` format. Can be imported directly into **Overleaf** or compiled locally using `pdflatex IEEE_Paper_RouteX.tex`.
3. **`IEEE_Paper_RouteX.md`**: Markdown version of the IEEE research paper for reading on GitHub, Notion, or rendering in VS Code.

## 📄 Paper Details

- **Title**: *Comparative Analysis and Empirical Benchmarking of Shortest Path and Graph Traversal Algorithms on Realistic Road Topologies*
- **Author**: Parth
- **Affiliation**: Department of Computer Science & Engineering, Academic Laboratory for Analysis of Algorithms
- **Core Topics Covered**:
  - Problem Motivation & Heuristic Pruning Formulation
  - Theoretical Complexity Matrix ($\mathcal{O}(V+E)$ vs $\mathcal{O}((V+E)\log V)$)
  - Mathematical Proof of A* Admissibility ($h(n) \le d^*(n)$) using the spherical Haversine metric
  - Mathematical Proof of A* Consistency (Monotonicity) via Triangle Inequality
  - Procedural 100+ node road network simulation with Bezier curvature and 9 bridge bottlenecks
  - Empirical Findings: A* 57.6% node pruning vs. Dijkstra, BFS hop-optimality vs. distance-optimality trade-off, and Greedy search obstacle trapping
  - Full IEEE bibliography [1]–[6]
