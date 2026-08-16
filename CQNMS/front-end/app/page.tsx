"use client";
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StatsPanel from './components/StatsPanel';
import NetworkMap from './components/NetworkMap';
import { fetchStats } from './lib/api';
import type { Stats } from './lib/types';

// Dashboard logic lives in its own component so it can sit inside Suspense below
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read the initial intensity from the URL, default to 1000
  const initialIntensity = Number(searchParams.get('intensity')) || 1000;

  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState("Round Robin");
  const [intensity, setIntensity] = useState(initialIntensity);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      const requestId = ++requestIdRef.current;
      try {
        const data = await fetchStats(selectedAlgo, intensity, controller.signal);
        if (requestId !== requestIdRef.current) return; // a newer request already superseded this one
        setStats(data);
        setError(false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && requestId === requestIdRef.current) {
          console.error("API Error:", err);
          setError(true);
        }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => { clearInterval(interval); controller.abort(); };
  }, [selectedAlgo, intensity]);

  const getBarColor = (load: number) => {
    if (load > 85) return 'bg-danger';
    if (load > 60) return 'bg-text-faint';
    return 'bg-border-strong';
  };

  const handleIntensityChange = (val: number) => {
    setIntensity(val);
    // Update the URL without triggering a state reset
    router.push(`/?intensity=${val}`, { scroll: false });
  };

  return (
    <main className="h-screen w-full bg-bg p-4 font-sans text-text overflow-hidden flex flex-col gap-4">
      <header className="h-[60px] bg-surface border border-border rounded-xl px-6 flex items-center justify-between shrink-0">
        <h1 className="text-text font-semibold text-sm flex items-center gap-2">
          <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded text-[10px] font-medium">v2.1</span>
          FYP · <span className="text-text-muted">CQNMS Engine</span>
        </h1>
        {error && (
          <div className="bg-danger-bg text-danger px-4 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-2 border border-danger/20">
            ⚠ Backend unreachable
          </div>
        )}
        {!error && stats?.prediction && stats.prediction > 0.7 && (
          <div className="bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-2">
            ⚠ Predictive alert: high load
          </div>
        )}
        <div className="flex items-center gap-2">
           <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
           <span className="text-[11px] font-medium text-text-muted">System Online</span>
        </div>
      </header>

      <div className="bg-surface border border-border rounded-xl p-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-4 px-4 py-2">
            <span className="text-[11px] font-medium text-text-muted">Traffic Intensity</span>
            <input
              type="range" min="100" max="5000" step="100"
              value={intensity}
              onChange={(e) => handleIntensityChange(Number(e.target.value))}
              className="w-32 h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-xs font-semibold text-text w-12">{intensity}</span>
          </div>
          <div className="flex gap-2">
            {["Round Robin", "SJF", "Priority", "Least Loaded"].map(a => (
              <button key={a} onClick={() => setSelectedAlgo(a)}
                className={`px-4 py-2 rounded-lg text-[11px] font-medium transition-all border ${selectedAlgo === a ? 'bg-accent text-accent-foreground border-accent' : 'bg-surface text-text-muted border-border hover:border-accent hover:text-text'}`}>
                {a}
              </button>
            ))}
          </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-12 lg:col-span-2"><StatsPanel stats={stats} /></div>
        <div className="col-span-12 lg:col-span-7 bg-surface border border-border rounded-xl p-4 relative overflow-hidden text-center flex flex-col justify-center">
           <div className="absolute top-4 left-6 z-10"><span className="bg-accent text-accent-foreground text-[10px] font-medium px-3 py-1.5 rounded">Network Topology</span></div>
           <NetworkMap stats={stats} />
        </div>
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="h-[40%] bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
            <h3 className="text-[11px] font-medium text-text-muted mb-5 text-center">Node Resource Health</h3>
            <div className="flex-1 flex flex-col justify-center space-y-5">
              {stats?.servers?.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-[11px] font-medium mb-1.5"><span className="text-text-muted">{s.name}</span><span className="text-text font-semibold">{s.load}%</span></div>
                  <div className="w-full bg-surface-2 h-1 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 ${getBarColor(s.load)}`} style={{ width: `${s.load}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-surface-dark p-5 rounded-xl flex flex-col min-h-0 relative">
            <h3 className="text-[10px] font-medium text-white/40 tracking-wide mb-4 text-center">Execution Logs</h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono scrollbar-hide text-[10px] text-white/60">
              {stats?.logs?.map((log, i) => <div key={i} className="py-1 border-b border-white/5 last:border-0">➜ {log.message}</div>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-sm text-text-muted">Synchronizing engine…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
