import type { Stats } from '../lib/types';

export default function StatsPanel({ stats }: { stats: Stats | null }) {
  const metrics = [
    { label: 'Latency', value: stats?.latency || 0, unit: 'ms' },
    { label: 'Throughput', value: stats?.throughput || 0, unit: '%' },
    { label: 'Queue Length', value: stats ? Math.floor(stats.traffic / 120) : 0, unit: 'req' },
    { label: 'AI Prediction', value: stats?.prediction || 0, unit: 'load', accent: true },
  ];

  return (
    <div className="flex flex-col gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface p-4 rounded-xl border border-border shadow-sm transition-all hover:border-border-strong">
          <p className="text-[10px] font-medium text-text-muted mb-1">{m.label}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-semibold ${m.accent ? 'text-accent' : 'text-text'}`}>{m.value}</span>
            <span className="text-[10px] font-medium text-text-faint">{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
