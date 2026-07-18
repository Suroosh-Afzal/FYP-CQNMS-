import React from 'react';

export default function NetworkMap({ stats }: { stats: any }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Central Gateway (FastAPI) */}
      <div className="absolute z-20 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-4 border-blue-500/20 text-center">
        <div className="text-[10px] font-black uppercase opacity-60">LB Gateway</div>
        <div className="text-xs font-bold">{stats?.active_algo || "Standby"}</div>
      </div>

      {/* SVG Connections (Animated Links) */}
      <svg className="absolute inset-0 w-full h-full">
        {stats?.servers?.map((s: any, i: number) => {
          const angle = (i * 90) * (Math.PI / 180);
          const x2 = 50 + 35 * Math.cos(angle);
          const y2 = 50 + 35 * Math.sin(angle);
          return (
            <line key={i} x1="50%" y1="50%" x2={`${x2}%`} y2={`${y2}%`} 
              stroke={s.load > 85 ? "#ef4444" : "#3b82f6"} 
              strokeWidth="2" strokeDasharray="5,5" className={stats?.traffic > 0 ? "animate-[dash_2s_linear_infinite]" : ""} />
          );
        })}
      </svg>

      {/* Server Nodes */}
      {stats?.servers?.map((s: any, i: number) => {
        const angle = (i * 90) * (Math.PI / 180);
        const top = 50 + 35 * Math.sin(angle);
        const left = 50 + 35 * Math.cos(angle);
        return (
          <div key={i} className="absolute transition-all duration-500 p-3 rounded-xl bg-white border-2 shadow-lg text-center"
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)', borderColor: s.load > 85 ? '#ef4444' : '#e2e8f0' }}>
            <div className="text-[9px] font-black text-slate-400 uppercase">{s.name}</div>
            <div className={`text-xs font-black ${s.load > 85 ? 'text-red-600' : 'text-slate-900'}`}>{s.load}%</div>
          </div>
        );
      })}
      
      <style jsx>{`
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  );
}