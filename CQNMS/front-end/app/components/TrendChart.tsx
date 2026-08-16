import { useId } from 'react';

interface Series {
  name: string;
  color: string;
  values: number[]; // actual samples, oldest first - same length as every other series
}

interface TrendChartProps {
  series: Series[];
  forecast: number;      // projected peak (max across series) at the next horizon
  threshold: number;     // alert threshold, 0-100
  sampleSeconds: number; // seconds between samples
  forecastSeconds: number; // how far ahead the forecast point sits
}

const W = 400;
const H = 220;
const MARGIN = { top: 10, right: 14, bottom: 26, left: 34 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

export default function TrendChart({ series, forecast, threshold, sampleSeconds, forecastSeconds }: TrendChartProps) {
  const gradientId = `trend-fill-${useId()}`;
  const n = series[0]?.values.length ?? 0;

  if (n < 2) {
    return <div className="h-full flex items-center justify-center text-xs text-text-muted">Collecting samples…</div>;
  }

  // n actual points at slots 0..n-1, plus one forecast slot at n - spread evenly across the plot width.
  const xAt = (i: number) => MARGIN.left + (i / n) * PLOT_W;
  const yAt = (v: number) => MARGIN.top + (1 - v / 100) * PLOT_H;
  const baseline = H - MARGIN.bottom;

  // Upper envelope (peak across all servers at each sample) - drawn as a soft filled
  // "danger surface" behind the per-server lines, with the forecast projected from it.
  const peakValues = Array.from({ length: n }, (_, i) => Math.max(0, ...series.map((s) => s.values[i] ?? 0)));
  const peakLinePoints = peakValues.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" L ");
  const areaPath = `M ${xAt(0)},${baseline} L ${peakLinePoints} L ${xAt(n - 1)},${baseline} Z`;
  const forecastLine = `${xAt(n - 1)},${yAt(peakValues[n - 1])} L ${xAt(n)},${yAt(forecast)}`;
  const thresholdY = yAt(threshold);
  const oldestSeconds = (n - 1) * sampleSeconds;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Per-server load trend and forecast">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#21201c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#21201c" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* y gridlines + labels */}
      {Y_TICKS.map((t) => (
        <g key={t}>
          <line x1={MARGIN.left} y1={yAt(t)} x2={W - MARGIN.right} y2={yAt(t)} className="stroke-border" strokeWidth="1" />
          <text x={MARGIN.left - 8} y={yAt(t)} textAnchor="end" dominantBaseline="middle" className="fill-text-muted" fontSize="10">
            {t}%
          </text>
        </g>
      ))}

      {/* axes */}
      <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={baseline} className="stroke-border-strong" strokeWidth="1" />
      <line x1={MARGIN.left} y1={baseline} x2={W - MARGIN.right} y2={baseline} className="stroke-border-strong" strokeWidth="1" />

      {/* x labels: oldest sample, now, forecast */}
      <text x={xAt(0)} y={baseline + 14} textAnchor="start" className="fill-text-muted" fontSize="10">-{oldestSeconds}s</text>
      <text x={xAt(n - 1)} y={baseline + 14} textAnchor="middle" className="fill-text-muted" fontSize="10">now</text>
      <text x={xAt(n)} y={baseline + 14} textAnchor="end" className="fill-text-muted" fontSize="10">+{forecastSeconds}s</text>

      {/* threshold reference line */}
      <line x1={MARGIN.left} y1={thresholdY} x2={W - MARGIN.right} y2={thresholdY} stroke="#b3452f" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
      <text x={W - MARGIN.right} y={thresholdY - 4} textAnchor="end" fill="#b3452f" fontSize="9" opacity="0.8">{threshold}% threshold</text>

      {/* filled "danger surface" under the peak envelope */}
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      {/* peak envelope forecast segment */}
      <path d={`M ${forecastLine}`} fill="none" className="stroke-text" strokeWidth="1.5" strokeDasharray="5,4" strokeLinecap="round" opacity="0.4" />
      <circle cx={xAt(n)} cy={yAt(forecast)} r="3" fill={forecast >= threshold ? "#b3452f" : "#83807a"} />

      {/* one line per server */}
      {series.map((s) => {
        const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" L ");
        const last = s.values[n - 1] ?? 0;
        return (
          <g key={s.name}>
            <path d={`M ${points}`} fill="none" stroke={s.color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
            <circle cx={xAt(n - 1)} cy={yAt(last)} r="2.5" fill={s.color} />
          </g>
        );
      })}
    </svg>
  );
}
