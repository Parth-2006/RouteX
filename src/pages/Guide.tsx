import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Code, Target, AlertCircle } from 'lucide-react';
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
