"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; 
import StatsPanel from './components/StatsPanel';
import NetworkMap from './components/NetworkMap';
import { API_BASE_URL } from './lib/api';

// 1. Dashboard ka saara logic humne alag component mein move kar diya hai
function DashboardContent() {
  const router = useRouter(); 
  const searchParams = useSearchParams();
  
  // Initial intensity URL se uthayega warna default 1000
  const initialIntensity = Number(searchParams.get('intensity')) || 1000;

  const [stats, setStats] = useState<any>(null);
  const [selectedAlgo, setSelectedAlgo] = useState("Round Robin");
  const [intensity, setIntensity] = useState(initialIntensity);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/stats?algo=${selectedAlgo}&intensity=${intensity}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error("API Error:", err);
      }
    };
    const interval = setInterval(fetchData, 1000);
    return () => { clearInterval(interval); controller.abort(); };
  }, [selectedAlgo, intensity]);

  const getBarColor = (load: number) => {
    if (load > 85) return 'bg-black shadow-[0_0_8px_rgba(0,0,0,0.3)]'; 
    if (load > 60) return 'bg-slate-500';
    return 'bg-slate-300';
  };

  const handleIntensityChange = (val: number) => {
    setIntensity(val);
    // Organic update: URL update ho rahi hai taake state reset na ho
    router.push(`/?intensity=${val}`, { scroll: false });
  };

  return (
    <main className="h-screen w-full bg-white p-4 font-sans text-black overflow-hidden flex flex-col gap-4">
      <header className="h-[60px] bg-white border border-slate-200 rounded-xl px-6 flex items-center justify-between shadow-sm shrink-0">
        <h1 className="text-black font-black tracking-tight text-sm uppercase flex items-center gap-2">
          <span className="bg-black text-white px-2 py-0.5 rounded text-[10px]">v2.1</span>
          FYP - <span className="opacity-50 font-bold">CQNMS ENGINE</span>
        </h1>
        {stats?.prediction > 0.7 && (
          <div className="bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-black animate-pulse flex items-center gap-2 border border-white/20">
            ⚠️ PREDICTIVE ALERT: HIGH LOAD
          </div>
        )}
        <div className="flex items-center gap-2">
           <span className="h-2 w-2 rounded-full bg-black animate-pulse"></span>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">System Online</span>
        </div>
      </header>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 px-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 px-4 py-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Traffic Intensity:</span>
            <input 
              type="range" min="100" max="5000" step="100"
              value={intensity} 
              onChange={(e) => handleIntensityChange(Number(e.target.value))} 
              className="w-32 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <span className="text-xs font-black text-black w-12">{intensity}</span>
          </div>
          <div className="flex gap-2">
            {["Round Robin", "SJF", "Priority", "Least Loaded"].map(a => (
              <button key={a} onClick={() => setSelectedAlgo(a)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${selectedAlgo === a ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-200 hover:border-black hover:text-black'}`}>
                {a}
              </button>
            ))}
          </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-12 lg:col-span-2"><StatsPanel stats={stats} /></div>
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 relative shadow-sm overflow-hidden text-center flex flex-col justify-center">
           <div className="absolute top-4 left-6 z-10"><span className="bg-black text-white text-[9px] font-black px-3 py-1.5 rounded uppercase shadow-md">Network Topology</span></div>
           <NetworkMap stats={stats} />
        </div>
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="h-[40%] bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 italic text-center">Node Resource Health</h3>
            <div className="flex-1 flex flex-col justify-center space-y-5">
              {stats?.servers?.map((s: any) => (
                <div key={s.name}>
                  <div className="flex justify-between text-[10px] font-bold mb-1.5"><span className="text-slate-700 uppercase">{s.name}</span><span className="text-black font-black">{s.load}%</span></div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 ${getBarColor(s.load)}`} style={{ width: `${s.load}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black p-5 rounded-xl flex flex-col min-h-0 relative border border-white/5 shadow-2xl">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic text-center">Execution Logs</h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono scrollbar-hide opacity-80 text-[10px] text-slate-400">
              {stats?.logs?.map((log: any, i: number) => <div key={i} className="py-1 border-b border-white/5 italic last:border-0">➜ {log.message}</div>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// 2. Export default component jo Suspense mein wrap ho
export default function Dashboard() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center font-black uppercase tracking-widest text-slate-400">Synchronizing Engine...</div>}>
      <DashboardContent />
    </Suspense>
  );
}