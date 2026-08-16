import type { Stats } from '../lib/types';

export default function NetworkMap({ stats }: { stats: Stats | null }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Central Gateway (FastAPI) */}
      <div className="absolute z-20 bg-surface-dark text-white p-4 rounded-2xl shadow-xl border-4 border-accent/10 text-center">
        <div className="text-[10px] font-medium text-white/50">LB Gateway</div>
        <div className="text-xs font-semibold">{stats?.active_algo || "Standby"}</div>
      </div>

      {/* SVG Connections (Animated Links) */}
      <svg className="absolute inset-0 w-full h-full">
        {stats?.servers?.map((s, i) => {
          const angle = (i * 90) * (Math.PI / 180);
          const x2 = 50 + 35 * Math.cos(angle);
          const y2 = 50 + 35 * Math.sin(angle);
          return (
            <line key={i} x1="50%" y1="50%" x2={`${x2}%`} y2={`${y2}%`}
              stroke={s.load > 85 ? "#b3452f" : "#21201c"}
              strokeOpacity={s.load > 85 ? 1 : 0.35}
              strokeWidth="2" strokeDasharray="5,5" className={(stats?.traffic ?? 0) > 0 ? "animate-[dash_2s_linear_infinite]" : ""} />
          );
        })}
      </svg>

      {stats?.servers?.map((s, i) => {
        const angle = (i * 90) * (Math.PI / 180);
        const top = 50 + 35 * Math.sin(angle);
        const left = 50 + 35 * Math.cos(angle);
        return (
          <div key={i} className="absolute transition-all duration-500 p-3 rounded-xl bg-surface border-2 shadow-sm text-center"
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)', borderColor: s.load > 85 ? '#b3452f' : '#e5e2d9' }}>
            <div className="text-[9px] font-medium text-text-muted">{s.name}</div>
            <div className={`text-xs font-semibold ${s.load > 85 ? 'text-danger' : 'text-text'}`}>{s.load}%</div>
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