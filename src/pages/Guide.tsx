import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Code, Target, AlertCircle, GraduationCap, HelpCircle } from 'lucide-react';
import { ALGORITHM_INFO } from '../utils/algorithmInfo';
import { AlgorithmInfo, AlgorithmName } from '../algorithms/types';
import { ALGORITHM_COLORS } from '../utils/helpers';

export function Guide() {
  const [expandedAlgo, setExpandedAlgo] = useState<AlgorithmName | null>('BFS');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="text-cyan-accent" size={24} />
          Algorithm Guide
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Learn about each route planning algorithm — how it works, when to use it, and its trade-offs
        </p>
      </div>

      {/* Quick comparison table */}
      <div className="bg-navy-800 border border-slate-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-border">
          <h2 className="text-sm font-semibold text-white">Quick Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-navy-700/50">
                <th className="px-4 py-2.5 text-left text-gray-400">Property</th>
                {ALGORITHM_INFO.map(a => (
                  <th key={a.name} className="px-3 py-2.5 text-center" style={{ color: ALGORITHM_COLORS[a.name] }}>
                    {a.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Time Complexity</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center text-gray-300 font-mono text-[10px]">{a.timeComplexity}</td>)}
              </tr>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Space Complexity</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center text-gray-300 font-mono text-[10px]">{a.spaceComplexity}</td>)}
              </tr>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Optimal?</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center text-gray-300">{a.optimal}</td>)}
              </tr>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Complete?</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center text-gray-300">{a.complete}</td>)}
              </tr>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Uses Weights?</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center">{a.usesWeights ? <span className="text-green-400">✓</span> : <span className="text-gray-600">✗</span>}</td>)}
              </tr>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Uses Heuristic?</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center">{a.usesHeuristic ? <span className="text-green-400">✓</span> : <span className="text-gray-600">✗</span>}</td>)}
              </tr>
              <tr className="border-t border-slate-border/30">
                <td className="px-4 py-2 text-gray-400">Data Structure</td>
                {ALGORITHM_INFO.map(a => <td key={a.name} className="px-3 py-2 text-center text-gray-300 text-[10px]">{a.dataStructure}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Algorithm details */}
      <div className="space-y-3">
        {ALGORITHM_INFO.map(algo => (
          <AlgorithmSection
            key={algo.name}
            algo={algo}
            isExpanded={expandedAlgo === algo.name}
            onToggle={() => setExpandedAlgo(expandedAlgo === algo.name ? null : algo.name)}
          />
        ))}
      </div>

      {/* Viva section */}
      <VivaSection />
    </div>
  );
}

function AlgorithmSection({ algo, isExpanded, onToggle }: { algo: AlgorithmInfo; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-navy-800 border border-slate-border rounded-xl overflow-hidden card-hover">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ALGORITHM_COLORS[algo.name] }} />
          <div>
            <span className="font-semibold text-white">{algo.fullName}</span>
            <span className="text-gray-500 text-xs ml-2">({algo.name})</span>
          </div>
        </div>
        {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-border/50">
          {/* Description */}
          <p className="text-sm text-gray-300 mt-3 leading-relaxed">{algo.description}</p>

          {/* Properties grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PropCard label="Time" value={algo.timeComplexity} />
            <PropCard label="Space" value={algo.spaceComplexity} />
            <PropCard label="Optimal" value={algo.optimal} />
            <PropCard label="Complete" value={algo.complete} />
          </div>

          {/* Pseudocode */}
          <div>
            <h4 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Code size={14} className="text-cyan-accent" /> Pseudocode
            </h4>
            <pre className="bg-navy-900 border border-slate-border rounded-lg p-3 text-xs text-gray-300 overflow-x-auto font-mono leading-relaxed">
              {algo.pseudocode}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Use cases */}
            <div>
              <h4 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
                <Target size={14} className="text-green-400" /> Use Cases
              </h4>
              <ul className="space-y-1">
                {algo.useCases.map((uc, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">•</span> {uc}
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div>
              <h4 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-400" /> Limitations
              </h4>
              <ul className="space-y-1">
                {algo.limitations.map((lim, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span> {lim}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PropCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-700/50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-xs text-gray-200 font-mono mt-0.5">{value}</div>
    </div>
  );
}

function VivaSection() {
  const questions = [
    {
      q: 'What is the main difference between BFS and DFS?',
      a: 'BFS uses a FIFO queue and explores level-by-level, guaranteeing the shortest path in unweighted graphs. DFS uses a LIFO stack and explores depth-first, finding a valid path but not necessarily the shortest one.',
    },
    {
      q: 'Why does Dijkstra guarantee optimality while Greedy does not?',
      a: "Dijkstra considers the actual cumulative cost g(n) from start to each node, always expanding the cheapest-so-far node. Greedy only considers the heuristic estimate h(n) to the goal, ignoring the cost already incurred, which can lead to suboptimal paths.",
    },
    {
      q: 'What makes A* optimal?',
      a: 'A* uses f(n) = g(n) + h(n), combining actual cost with an admissible heuristic (one that never overestimates). This guarantees it finds the optimal path while typically expanding fewer nodes than Dijkstra.',
    },
    {
      q: 'What is an admissible heuristic?',
      a: 'An admissible heuristic never overestimates the true cost to reach the goal. Manhattan distance is admissible for 4-directional grid movement with unit costs.',
    },
    {
      q: 'Why can BFS find the shortest path but not the cheapest on weighted graphs?',
      a: "BFS finds the path with the fewest edges (hops). In weighted graphs, a path with more edges can have lower total cost. BFS doesn't consider edge weights at all.",
    },
    {
      q: "Is DFS complete? Does it always find a path if one exists?",
      a: 'DFS is complete on finite graphs with cycle detection (tracking visited nodes). Without cycle detection, DFS could loop infinitely in graphs with cycles.',
    },
    {
      q: 'What data structure is essential for Dijkstra and A*?',
      a: 'A min-heap priority queue, which efficiently extracts the node with the lowest priority. Using a simple array would degrade performance from O((V+E) log V) to O(V²).',
    },
    {
      q: "What is peak frontier size and why is it used as a memory proxy?",
      a: "Peak frontier size is the maximum number of nodes in the open set (queue/frontier) at any point during execution. It approximates memory usage because the frontier is the primary source of memory consumption. It's a proxy, not actual memory measurement in bytes.",
    },
    {
      q: 'Why is no single algorithm best for all scenarios?',
      a: 'Each algorithm makes different trade-offs. BFS is optimal only for unweighted graphs. Dijkstra handles weights but explores all directions. A* is efficient with good heuristics but requires heuristic design. DFS is memory-efficient but non-optimal. Greedy is fast but can be misled.',
    },
    {
      q: 'How does the benchmarking methodology ensure fair comparison?',
      a: 'All algorithms run on identical, reproducible grid inputs (using seeded random generation) and identical road graph snapshots. Timing uses performance.now() strictly around execution, excluding data downloading and rendering.',
    },
    {
      q: 'How does the Haversine metric guarantee admissibility in A* on real-world road networks?',
      a: 'The straight-line spherical Haversine distance between any node and the destination is the shortest physical distance on the Earth surface. Real roads must follow terrain and street turns, meaning road distance >= straight-line distance (h(n) <= h*(n)). Because h never overestimates true road distance, it is strictly admissible, guaranteeing A* finds the optimal least-distance path.',
    },
    {
      q: 'Why can BFS find a path with fewer road segments that is geographically longer than Dijkstra?',
      a: 'BFS treats all edges with equal unit cost (w=1) and minimizes edge count (hops/intersections). On real road networks, a long ring-road or highway bypass may count as 1 edge, whereas a series of short city streets has multiple edges. BFS will select the single highway edge even if its physical distance in meters is longer than the city streets.',
    },
    {
      q: 'How are one-way streets handled in directed road graph algorithms?',
      a: 'One-way roads are modeled as directed edges (u -> v) without inserting the reverse edge (v -> u). The search algorithms only traverse outgoing edges from the adjacency list, naturally guaranteeing that calculated routes respect legal traffic flow.',
    },
  ];

  return (
    <div className="bg-navy-800 border border-slate-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-border flex items-center gap-2">
        <GraduationCap size={16} className="text-cyan-accent" />
        <h2 className="text-sm font-semibold text-white">AOA Viva Preparation</h2>
      </div>
      <div className="divide-y divide-slate-border/30">
        {questions.map((item, idx) => (
          <VivaItem key={idx} question={item.q} answer={item.a} index={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function VivaItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <span className="bg-cyan-accent/10 text-cyan-accent w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
          {index}
        </span>
        <span className="text-sm text-gray-200 flex-1">{question}</span>
        <HelpCircle size={14} className={`shrink-0 mt-1 transition-colors ${open ? 'text-cyan-accent' : 'text-gray-600'}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 pl-13">
          <p className="text-xs text-gray-400 leading-relaxed ml-9 pl-0.5">{answer}</p>
        </div>
      )}
    </div>
  );
}
