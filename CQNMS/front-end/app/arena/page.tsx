"use client";
import { useEffect, useRef, useState } from 'react';
import ComparisonCard from '../components/ComparisonCard'; // Path check karlein folder structure k mutabiq
import { fetchStats } from '../lib/api';
import type { Stats } from '../lib/types';

// Best performer: highest throughput first, lowest latency as a tie-breaker.
// Computed from the actual returned metrics instead of hardcoding an algo name.
function pickBestAlgo(results: Stats[]): string | null {
  if (results.length === 0) return null;
  return results.reduce((best, current) =>
    current.throughput > best.throughput ||
    (current.throughput === best.throughput && current.latency < best.latency)
      ? current
      : best
  ).active_algo;
}

export default function AlgorithmArena() {
  const [comparisonData, setComparisonData] = useState<Stats[]>([]);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const algos = ["Round Robin", "SJF", "Priority", "Least Loaded"];
    const controller = new AbortController();
    const fetchAll = async () => {
      const requestId = ++requestIdRef.current;
      try {
        // Har algorithm ke liye live parallel requests
        const results = await Promise.all(
          algos.map(a => fetchStats(a, 3000, controller.signal))
        );
        if (requestId !== requestIdRef.current) return; // a newer cycle already superseded this one
        setComparisonData(results);
        setError(false);
      } catch (err: any) {
        if (err.name !== 'AbortError' && requestId === requestIdRef.current) {
          console.error("Arena Fetch Error:", err);
          setError(true);
        }
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 2000); // 2 seconds update cycle
    return () => { clearInterval(interval); controller.abort(); };
  }, []);

  const bestAlgo = pickBestAlgo(comparisonData);

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
          {error && (
            <p className="mt-4 inline-block bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black animate-pulse">
              ⚠️ BACKEND UNREACHABLE
            </p>
          )}
        </header>

        {/* Clean Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {comparisonData.length > 0 ? (
            comparisonData.map((data, idx) => (
              <ComparisonCard key={idx} data={data} isBest={data.active_algo === bestAlgo} />
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