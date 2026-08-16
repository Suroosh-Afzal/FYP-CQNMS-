"use client";
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchStats } from '../lib/api';
import TrendChart from '../components/TrendChart';
import type { ServerStat, Stats } from '../lib/types';

const HISTORY_LENGTH = 20;       // samples kept for the trend chart (40s at a 2s poll)
const REGRESSION_WINDOW = 8;     // most recent samples used to fit the forecast trend
const FORECAST_STEPS = 5;        // steps ahead to project (~10s at a 2s poll)
const SAMPLE_SECONDS = 2;        // poll interval
const THRESHOLD_KEY = "cqnms_alert_threshold";
const DEFAULT_THRESHOLD = 85;
const SOUND_KEY = "cqnms_alert_sound";
const NOTIFY_KEY = "cqnms_alert_notify";

// Short two-tone beep via Web Audio - no audio asset to bundle/host, works offline.
function playAlertBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio unavailable/blocked - the visual/browser alerts still cover it
  }
}

// Same validated (CVD/contrast) categorical palette used for algorithms on the Reports
// page, reused here per-server since both are fixed 4-item sets.
const SERVER_COLOR: Record<string, string> = {
  "SRV-1": "#2a78d6",
  "SRV-2": "#008300",
  "SRV-3": "#e87ba4",
  "SRV-4": "#eda100",
};

// Highest load across all servers at each sample index - the "danger surface" the
// forecast and threshold are evaluated against.
function peakEnvelope(history: Record<string, number[]>): number[] {
  const arrays = Object.values(history);
  const n = arrays[0]?.length ?? 0;
  return Array.from({ length: n }, (_, i) => Math.max(0, ...arrays.map((a) => a[i] ?? 0)));
}

// Least-squares fit over the last `window` points, projected `stepsAhead` beyond the last sample.
function forecastNext(values: number[], window: number, stepsAhead: number): number {
  const sample = values.slice(-window);
  const n = sample.length;
  if (n === 0) return 0;
  if (n < 2) return sample[0];

  const xMean = (n - 1) / 2;
  const yMean = sample.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  sample.forEach((y, i) => {
    num += (i - xMean) * (y - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const projected = intercept + slope * (n - 1 + stepsAhead);
  return Math.max(0, Math.min(100, projected));
}

function MetricRow({ label, value, unit, danger }: { label: string; value: string; unit?: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${danger ? 'text-danger' : 'text-text'}`}>
        {value}{unit && <span className="text-[10px] font-medium text-text-faint ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function InnovationContent() {
  const searchParams = useSearchParams();
  const currentIntensity = Number(searchParams.get('intensity')) || 1000;
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [error, setError] = useState(false);
  // Threshold is a per-browser preference - read once during the initial render (avoids an
  // extra setState-in-effect render pass), persisted to localStorage on every change below.
  const [threshold, setThreshold] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THRESHOLD;
    const saved = localStorage.getItem(THRESHOLD_KEY);
    return saved ? Number(saved) : DEFAULT_THRESHOLD;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SOUND_KEY) === "true";
  });
  const [notifyEnabled, setNotifyEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NOTIFY_KEY) === "true";
  });
  const requestIdRef = useRef(0);
  const wasOverloadedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(THRESHOLD_KEY, String(threshold));
  }, [threshold]);
  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);
  useEffect(() => {
    localStorage.setItem(NOTIFY_KEY, String(notifyEnabled));
  }, [notifyEnabled]);

  const toggleNotifications = async (checked: boolean) => {
    if (!checked || typeof Notification === "undefined") {
      setNotifyEnabled(false);
      return;
    }
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    setNotifyEnabled(permission === "granted");
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      const requestId = ++requestIdRef.current;
      try {
        const data = await fetchStats("Least Loaded", currentIntensity, controller.signal);
        if (requestId !== requestIdRef.current) return; // a newer request already superseded this one
        setStats(data);
        setError(false);
        setHistory((prev) => {
          const next: Record<string, number[]> = {};
          for (const s of data.servers) {
            next[s.name] = [...(prev[s.name] ?? []), s.load].slice(-HISTORY_LENGTH);
          }
          return next;
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && requestId === requestIdRef.current) {
          console.error("Fetch Error:", err);
          setError(true); // Backend is unreachable - surface the error state
        }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, SAMPLE_SECONDS * 1000);
    return () => { clearInterval(interval); controller.abort(); };
  }, [currentIntensity]);

  const forecast = forecastNext(peakEnvelope(history), REGRESSION_WINDOW, FORECAST_STEPS);
  const overloadedServers = stats?.servers?.filter((s) => s.load >= threshold) ?? [];
  const forecastCrossing = forecast >= threshold && overloadedServers.length === 0;
  const forecastSeconds = FORECAST_STEPS * SAMPLE_SECONDS;
  const series = Object.entries(history)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, values]) => ({ name, color: SERVER_COLOR[name] ?? "#83807a", values }));

  const isOverloaded = overloadedServers.length > 0;
  const overloadedNames = overloadedServers.map((s) => s.name).join(", ");

  // Fire sound/notification only on the leading edge of a new overload event, not on
  // every poll while it stays overloaded - otherwise it would beep/notify every 2s.
  useEffect(() => {
    if (isOverloaded && !wasOverloadedRef.current) {
      if (soundEnabled) playAlertBeep();
      if (notifyEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("CQNMS overload alert", {
          body: `${overloadedNames} at or above ${threshold}% threshold`,
        });
      }
    }
    wasOverloadedRef.current = isOverloaded;
  }, [isOverloaded, overloadedNames, threshold, soundEnabled, notifyEnabled]);

  return (
    <main className="h-screen w-full bg-bg p-4 text-text overflow-hidden flex flex-col gap-4">
      <header className="h-[60px] bg-surface border border-border rounded-xl px-6 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] font-medium text-text-muted block leading-tight">R&D Node</span>
          <h1 className="text-base font-semibold text-text leading-tight">Innovation</h1>
        </div>

        {error && (
          <div className="bg-danger-bg text-danger px-4 py-1.5 rounded-full text-[11px] font-medium">
            ⚠ Backend unreachable
          </div>
        )}
        {!error && overloadedServers.length > 0 && (
          <div className="bg-danger-bg text-danger px-4 py-1.5 rounded-full text-[11px] font-medium">
            ⚠ {overloadedServers.map((s) => s.name).join(", ")} ≥ {threshold}% threshold
          </div>
        )}
        {!error && overloadedServers.length === 0 && forecastCrossing && (
          <div className="bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-[11px] font-medium">
            ↗ Projected to cross {threshold}% in ~{forecastSeconds}s
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
          <span className="text-[11px] font-medium text-text-muted">Predictive Engine</span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="bg-surface border border-border rounded-xl p-5 shrink-0">
            <h2 className="text-sm font-semibold text-text mb-4">Live Metrics</h2>
            <div className="flex flex-col gap-3">
              <MetricRow label="Prediction Score" value={stats?.prediction?.toFixed(2) ?? "0.00"} />
              <MetricRow label="Live Load Flow" value={String(currentIntensity)} unit="req/s" />
              <MetricRow
                label={`Projected Peak (~${forecastSeconds}s)`}
                value={`${forecast.toFixed(0)}%`}
                danger={forecast >= threshold}
              />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shrink-0">
            <h2 className="text-sm font-semibold text-text mb-1">Alert Threshold</h2>
            <p className="text-[11px] text-text-muted mb-4">Overload alert fires above this load</p>
            <div className="flex items-center gap-3">
              <input
                type="range" min="50" max="100" step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-xs font-semibold text-text w-10 text-right tabular-nums">{threshold}%</span>
            </div>

            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="accent-accent"
                />
                Sound alert
              </label>
              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEnabled}
                  onChange={(e) => toggleNotifications(e.target.checked)}
                  className="accent-accent"
                />
                Browser notification
              </label>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-surface border border-border rounded-xl p-5 flex flex-col min-h-0">
          <div className="shrink-0 mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Per-Server Load Trend &amp; Forecast</h2>
              <p className="text-[11px] text-text-muted mt-0.5">Shaded = peak forecast · dashed = projected · red = alert threshold</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] font-medium text-text-muted">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <TrendChart
              series={series}
              forecast={forecast}
              threshold={threshold}
              sampleSeconds={SAMPLE_SECONDS}
              forecastSeconds={forecastSeconds}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-surface border border-border rounded-xl p-5 flex flex-col min-h-0">
          <h2 className="text-sm font-semibold text-text mb-4 shrink-0">Self-Healing Infrastructure</h2>
          <div className="grid grid-cols-2 gap-3">
             {(stats?.servers ?? Array.from({ length: 4 })).map((s: ServerStat | undefined, idx: number) => {
               const isOverloaded = (s?.load ?? 0) >= threshold;
               return (
                 <div key={idx} className="bg-surface-2 p-4 rounded-xl border border-border text-center">
                    <div className={`h-1.5 w-1.5 rounded-full mx-auto mb-2 ${isOverloaded ? 'bg-danger animate-ping' : 'bg-success'}`}></div>
                    <p className="text-[10px] font-medium text-text-muted">{s?.name || `SRV-${idx + 1}`}</p>
                    <p className={`text-xs font-semibold mt-1 ${isOverloaded ? 'text-danger' : 'text-text'}`}>{s ? `${s.load}%` : 'Offline'}</p>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function InnovationVault() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-sm text-text-muted">Syncing engine…</div>}>
      <InnovationContent />
    </Suspense>
  );
}
