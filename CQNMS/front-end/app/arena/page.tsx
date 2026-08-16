"use client";
import { useEffect, useRef, useState } from 'react';
import ComparisonCard from '../components/ComparisonCard';
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
        // Live parallel requests, one per algorithm
        const results = await Promise.all(
          algos.map(a => fetchStats(a, 3000, controller.signal))
        );
        if (requestId !== requestIdRef.current) return; // a newer cycle already superseded this one
        setComparisonData(results);
        setError(false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && requestId === requestIdRef.current) {
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
    <main className="h-screen w-full bg-bg p-4 text-text overflow-hidden flex flex-col gap-4">
      <header className="h-[60px] bg-surface border border-border rounded-xl px-6 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] font-medium text-text-muted block leading-tight">Benchmarking System</span>
          <h1 className="text-base font-semibold text-text leading-tight">Algorithm Arena</h1>
        </div>

        {error && (
          <div className="bg-danger-bg text-danger px-4 py-1.5 rounded-full text-[11px] font-medium">
            ⚠ Backend unreachable
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
          <span className="text-[11px] font-medium text-text-muted">3000 req/intensity</span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-4 min-h-0">
        {comparisonData.length > 0 ? (
          comparisonData.map((data, idx) => (
            <ComparisonCard key={idx} data={data} isBest={data.active_algo === bestAlgo} />
          ))
        ) : (
          // Shimmer/Loading State (Minimalist)
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-2 rounded-2xl animate-pulse border border-border"></div>
          ))
        )}
      </div>
    </main>
  );
}
