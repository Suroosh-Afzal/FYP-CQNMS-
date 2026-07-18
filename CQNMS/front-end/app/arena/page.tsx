"use client";
import { useEffect, useState } from 'react';
import ComparisonCard from '../components/ComparisonCard'; // Path check karlein folder structure k mutabiq
import { API_BASE_URL } from '../lib/api';

export default function AlgorithmArena() {
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  useEffect(() => {
    const algos = ["Round Robin", "SJF", "Priority", "Least Loaded"];
    const fetchAll = async () => {
      try {
        // Har algorithm ke liye live parallel requests
        const results = await Promise.all(
          algos.map(a => 
            fetch(`${API_BASE_URL}/api/stats?algo=${a}&intensity=3000`)
              .then(r => r.json())
          )
        );
        setComparisonData(results);
      } catch (err) {
        console.error("Arena Fetch Error:", err);
      }
    };

    const interval = setInterval(fetchAll, 2000); // 2 seconds update cycle
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-10 bg-white min-h-screen text-black">
      <div className="max-w-6xl mx-auto">
        {/* Minimalist Header */}
        <header className="mb-12 border-b border-slate-100 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="h-2 w-2 bg-black rounded-full"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Benchmarking.System</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Algorithm Arena</h1>
          <p className="text-slate-400 font-medium text-xs mt-2 uppercase tracking-widest">
            Live Performance Metrics at 3000 Req/Intensity
          </p>
        </header>

        {/* Clean Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {comparisonData.length > 0 ? (
            comparisonData.map((data, idx) => (
              <ComparisonCard key={idx} data={data} />
            ))
          ) : (
            // Shimmer/Loading State (Minimalist)
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-slate-50 rounded-2xl animate-pulse border border-slate-100"></div>
            ))
          )}
        </div>

        {/* Footer Insight */}
        <footer className="mt-16 pt-8 border-t border-slate-50">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] text-center">
            Proactive Load Analysis Engine © 2026 CQNMS
          </p>
        </footer>
      </div>
    </div>
  );
}