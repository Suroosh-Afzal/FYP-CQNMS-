"use client";
import { useEffect, useRef, useState } from 'react';
import {
  DatabaseUnavailableError,
  fetchAlgorithmComparisonReport,
  fetchOverloadIncidentsReport,
  fetchServerLoadReport,
} from '../lib/api';
import type { AlgorithmComparisonRow, OverloadIncidentRow, ServerLoadReportRow } from '../lib/types';
import ReportBar from '../components/ReportBar';

const ALGORITHMS = ["Round Robin", "SJF", "Priority", "Least Loaded"] as const;

const RANGE_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "All time", minutes: null },
  { label: "Last 15 min", minutes: 15 },
  { label: "Last 1 hour", minutes: 60 },
  { label: "Last 24 hours", minutes: 1440 },
];

// Fixed categorical order (validated for CVD/contrast) - never cycled, never reassigned per filter.
const ALGO_COLOR: Record<string, string> = {
  "Round Robin": "#2a78d6",
  "SJF": "#008300",
  "Priority": "#e87ba4",
  "Least Loaded": "#eda100",
};

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {ALGORITHMS.map((a) => (
        <div key={a} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ALGO_COLOR[a] }} />
          <span className="text-[11px] font-medium text-text-muted">{a}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [serverLoad, setServerLoad] = useState<ServerLoadReportRow[]>([]);
  const [comparison, setComparison] = useState<AlgorithmComparisonRow[]>([]);
  const [overloads, setOverloads] = useState<OverloadIncidentRow[]>([]);
  const [dbUnavailable, setDbUnavailable] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rangeMinutes, setRangeMinutes] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAll = async () => {
      const requestId = ++requestIdRef.current;
      try {
        const [load, comp, overload] = await Promise.all([
          fetchServerLoadReport(rangeMinutes, controller.signal),
          fetchAlgorithmComparisonReport(rangeMinutes, controller.signal),
          fetchOverloadIncidentsReport(rangeMinutes, controller.signal),
        ]);
        if (requestId !== requestIdRef.current) return;
        setServerLoad(load);
        setComparison(comp);
        setOverloads(overload);
        setDbUnavailable(false);
        setError(false);
      } catch (err) {
        if ((err instanceof Error && err.name === 'AbortError') || requestId !== requestIdRef.current) return;
        if (err instanceof DatabaseUnavailableError) {
          setDbUnavailable(true);
        } else {
          console.error("Reports fetch error:", err);
          setError(true);
        }
      } finally {
        setLoaded(true);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5000); // aggregate reports, no need to poll every second
    return () => { clearInterval(interval); controller.abort(); };
  }, [rangeMinutes]);

  const ready = loaded && !dbUnavailable && !error;
  const rangeLabel = (RANGE_OPTIONS.find((o) => o.minutes === rangeMinutes)?.label ?? "All time").toLowerCase();

  return (
    <main className="h-screen w-full bg-bg p-4 text-text overflow-hidden flex flex-col gap-4">
      <header className="h-[60px] bg-surface border border-border rounded-xl px-6 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] font-medium text-text-muted block leading-tight">Audit Log</span>
          <h1 className="text-base font-semibold text-text leading-tight">Reports</h1>
        </div>

        {dbUnavailable && (
          <div className="bg-surface-dark text-white px-4 py-1.5 rounded-full text-[11px] font-medium">
            ⚠ Database not connected
          </div>
        )}
        {error && !dbUnavailable && (
          <div className="bg-danger-bg text-danger px-4 py-1.5 rounded-full text-[11px] font-medium">
            ⚠ Backend unreachable
          </div>
        )}
        {ready && <Legend />}

        <div className="flex items-center gap-3">
          <select
            value={rangeMinutes ?? "all"}
            onChange={(e) => setRangeMinutes(e.target.value === "all" ? null : Number(e.target.value))}
            className="text-[11px] font-medium text-text bg-surface-2 border border-border rounded-full px-3 py-1.5 cursor-pointer focus:outline-none focus:border-accent"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.minutes ?? "all"}>{opt.label}</option>
            ))}
          </select>
          <span className="text-[11px] font-medium text-text-muted">Updates every 5s</span>
        </div>
      </header>

      {!ready ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          {!loaded && <p className="text-xs font-medium text-text-muted">Loading reports...</p>}
          {dbUnavailable && (
            <p className="text-xs text-text-muted max-w-md text-center">
              Set DB_ENABLED=true and run the backend locally — Windows Authentication SQL Server is not reachable from the Docker backend.
            </p>
          )}
          {error && !dbUnavailable && <p className="text-xs text-text-muted">Backend unreachable.</p>}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          {/* Load distribution per algorithm, small multiples */}
          <div className="col-span-12 lg:col-span-5 bg-surface border border-border rounded-xl p-5 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-text shrink-0">Load Distribution</h2>
            <p className="text-[11px] text-text-muted mb-4 shrink-0">Average load % per server, {rangeLabel}</p>
            {serverLoad.length === 0 ? (
              <p className="text-xs text-text-muted">No data in this range — generate traffic on the dashboard first.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 content-start pr-1">
                {ALGORITHMS.map((algo) => {
                  const rows = serverLoad.filter((r) => r.algorithm === algo);
                  if (rows.length === 0) return null;
                  return (
                    <div key={algo} className="p-4 rounded-xl border border-border">
                      <h3 className="text-xs font-semibold mb-3" style={{ color: ALGO_COLOR[algo] }}>{algo}</h3>
                      <div className="space-y-2.5">
                        {rows.map((r) => (
                          <ReportBar
                            key={r.server_name}
                            label={r.server_name}
                            value={r.avg_load_pct}
                            maxValue={100}
                            color={ALGO_COLOR[algo]}
                            displayValue={`${r.avg_load_pct}%`}
                            tooltipSeries={`${r.samples} samples, peak ${r.peak_load_pct}%`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Algorithm performance comparison - one metric per chart, never dual-axis */}
          <div className="col-span-12 lg:col-span-4 bg-surface border border-border rounded-xl p-5 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-text shrink-0">Performance Comparison</h2>
            <p className="text-[11px] text-text-muted mb-4 shrink-0">Aggregate across traffic, {rangeLabel}</p>
            {comparison.length === 0 ? (
              <p className="text-xs text-text-muted">No data in this range — generate traffic on the dashboard first.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                <div>
                  <h3 className="text-[11px] font-medium text-text-muted mb-2">Avg Latency</h3>
                  <div className="space-y-2.5">
                    {comparison.map((c) => (
                      <ReportBar
                        key={c.algorithm}
                        label={c.algorithm}
                        value={c.avg_latency_ms}
                        maxValue={Math.max(...comparison.map((x) => x.avg_latency_ms), 1)}
                        color={ALGO_COLOR[c.algorithm]}
                        displayValue={`${c.avg_latency_ms}ms`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-medium text-text-muted mb-2">Avg Throughput</h3>
                  <div className="space-y-2.5">
                    {comparison.map((c) => (
                      <ReportBar
                        key={c.algorithm}
                        label={c.algorithm}
                        value={c.avg_throughput_pct}
                        maxValue={100}
                        color={ALGO_COLOR[c.algorithm]}
                        displayValue={`${c.avg_throughput_pct}%`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-medium text-text-muted mb-2">Avg Prediction Score</h3>
                  <div className="space-y-2.5">
                    {comparison.map((c) => (
                      <ReportBar
                        key={c.algorithm}
                        label={c.algorithm}
                        value={c.avg_prediction_score}
                        maxValue={1}
                        color={ALGO_COLOR[c.algorithm]}
                        displayValue={c.avg_prediction_score.toFixed(2)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overload incidents - sparse counts read best as a table */}
          <div className="col-span-12 lg:col-span-3 bg-surface border border-border rounded-xl p-5 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-text shrink-0">Overload Incidents</h2>
            <p className="text-[11px] text-text-muted mb-4 shrink-0">Load exceeded 85%, {rangeLabel}</p>
            {overloads.length === 0 ? (
              <p className="text-xs text-text-muted">No overload incidents recorded.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left sticky top-0 bg-surface">
                      <th className="py-2 pr-2 font-medium text-[10px] text-text-muted">Algorithm</th>
                      <th className="py-2 pr-2 font-medium text-[10px] text-text-muted">Server</th>
                      <th className="py-2 font-medium text-[10px] text-text-muted text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overloads.map((o, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-2 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: ALGO_COLOR[o.algorithm] }} />
                            <span className="truncate">{o.algorithm}</span>
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-text-muted">{o.server_name}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">{o.overload_incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
