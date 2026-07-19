"use client";
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchStats } from '../lib/api';
import type { ServerStat, Stats } from '../lib/types';

function InnovationContent() {
  const searchParams = useSearchParams();
  const currentIntensity = Number(searchParams.get('intensity')) || 1000;
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      const requestId = ++requestIdRef.current;
      try {
        const data = await fetchStats("Least Loaded", currentIntensity, controller.signal);
        if (requestId !== requestIdRef.current) return; // a newer request already superseded this one
        setStats(data);
        setError(false);
      } catch (err: any) {
        if (err.name !== 'AbortError' && requestId === requestIdRef.current) {
          console.error("Fetch Error:", err);
          setError(true); // Backend is unreachable - surface the error state
        }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => { clearInterval(interval); controller.abort(); };
  }, [currentIntensity]);

  return (
    <div className="p-10 bg-white min-h-screen text-black">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-l-[12px] border-black pl-6 italic">
          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.4em]">R&D Node</span>
          <h1 className="text-6xl font-black uppercase tracking-tighter mt-2 text-black italic">Innovation</h1>
        </header>

        {error && (
          <div className="bg-black text-white p-4 rounded-xl mb-8 text-xs font-mono animate-pulse">
            ⚠️ BACKEND CONNECTION LOST: Verify uvicorn is running on port 8000
          </div>
        )}

        <div className="grid gap-8">
          <section className="bg-black rounded-[2.5rem] p-10 text-white shadow-2xl">
            <h2 className="text-2xl font-black mb-8 uppercase border-b border-white/10 pb-4 italic text-slate-300 italic">Predictive Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-2 italic">Prediction Score</p>
                <p className="text-5xl font-black tabular-nums tracking-tighter">{stats?.prediction || "0.00"}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-2 italic">Live Load Flow</p>
                <p className="text-3xl font-black uppercase tabular-nums">{currentIntensity} <span className="text-xs opacity-40 italic">req/s</span></p>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-2 italic">System Health</p>
                <p className="text-2xl font-black uppercase italic tracking-tighter text-slate-300 italic">Elite Cluster</p>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200">
            <h2 className="text-xl font-black mb-6 uppercase italic tracking-widest italic">Self-Healing Infrastructure</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {(stats?.servers ?? Array.from({ length: 4 })).map((s: ServerStat | undefined, idx: number) => (
                 <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <div className={`h-1.5 w-1.5 rounded-full mx-auto mb-3 ${(s?.load ?? 0) > 85 ? 'bg-black animate-ping' : 'bg-slate-300'}`}></div>
                    <p className="text-[9px] font-black opacity-30 uppercase italic">{s?.name || `SRV-${idx+1}`}</p>
                    <p className="text-[10px] font-black uppercase mt-1 italic">{s?.status || 'Offline'}</p>
                 </div>
               ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function InnovationVault() {
  return (
    <Suspense fallback={<div className="p-20 font-black italic">Syncing Engine...</div>}>
      <InnovationContent />
    </Suspense>
  );
}