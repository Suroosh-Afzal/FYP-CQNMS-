import React from 'react';

export default function StatsPanel({ stats }: { stats: any }) {
  const metrics = [
    { label: 'Latency', value: stats?.latency || 0, unit: 'ms', color: 'text-blue-600' },
    { label: 'Throughput', value: stats?.throughput || 0, unit: '%', color: 'text-emerald-600' },
    { label: 'Queue Length', value: Math.floor(stats?.traffic / 120) || 0, unit: 'req', color: 'text-amber-600' },
    { label: 'AI Prediction', value: stats?.prediction || 0, unit: 'load', color: 'text-purple-600' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${m.color}`}>{m.value}</span>
            <span className="text-[10px] font-bold text-slate-400">{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}