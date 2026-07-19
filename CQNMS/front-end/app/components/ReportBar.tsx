"use client";
import { useState } from 'react';

interface ReportBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  displayValue: string;
  tooltipSeries?: string;
}

export default function ReportBar({ label, value, maxValue, color, displayValue, tooltipSeries }: ReportBarProps) {
  const [active, setActive] = useState(false);
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[10px] font-black text-slate-500 uppercase truncate" title={label}>{label}</span>
      <div
        className="relative flex-1 h-4 bg-slate-100 rounded-sm"
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        tabIndex={0}
      >
        <div
          className="h-full rounded-r-sm transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {active && (
          <div className="absolute -top-8 left-0 z-10 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] font-bold text-white shadow-lg">
            {tooltipSeries ? `${tooltipSeries} — ` : ''}{displayValue}
          </div>
        )}
      </div>
      <span className="w-16 shrink-0 text-right text-[10px] font-black text-black tabular-nums">{displayValue}</span>
    </div>
  );
}
