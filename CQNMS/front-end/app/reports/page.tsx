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

// Fixed categorical order (validated for CVD/contrast) - never cycled, never reassigned per filter.
const ALGO_COLOR: Record<string, string> = {
  "Round Robin": "#2a78d6",
  "SJF": "#008300",
  "Priority": "#e87ba4",
  "Least Loaded": "#eda100",
};

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      {ALGORITHMS.map((a) => (
        <div key={a} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ALGO_COLOR[a] }} />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{a}</span>
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
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAll = async () => {
      const requestId = ++requestIdRef.current;
      try {
        const [load, comp, overload] = await Promise.all([
          fetchServerLoadReport(controller.signal),
          fetchAlgorithmComparisonReport(controller.signal),
          fetchOverloadIncidentsReport(controller.signal),
        ]);
        if (requestId !== requestIdRef.current) return;
        setServerLoad(load);
        setComparison(comp);
        setOverloads(overload);
        setDbUnavailable(false);
        setError(false);
      } catch (err: any) {
        if (err.name === 'AbortError' || requestId !== requestIdRef.current) return;
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
  }, []);

  return (
    <div className="p-10 bg-white min-h-screen text-black">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 border-b border-slate-100 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="h-2 w-2 bg-black rounded-full"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Audit.Log</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Reports</h1>
          <p className="text-slate-400 font-medium text-xs mt-2 uppercase tracking-widest">
            Historical stats persisted to SQL Server (updates every 5s)
          </p>
        </header>

        {!loaded && !dbUnavailable && !error && (
          <p className="text-xs font-bold text-slate-400 uppercase">Loading reports...</p>
        )}

        {dbUnavailable && (
          <div className="bg-black text-white p-6 rounded-xl mb-8 text-xs font-mono">
            ⚠️ DATABASE NOT CONNECTED — set DB_ENABLED=true and run the backend locally
            (Windows Authentication SQL Server isn't reachable from the Docker backend).
          </div>
        )}

        {error && !dbUnavailable && (
          <div className="bg-red-600 text-white p-6 rounded-xl mb-8 text-xs font-mono">
            ⚠️ BACKEND UNREACHABLE
          </div>
        )}

        {loaded && !dbUnavailable && !error && (
          <>
            <Legend />

            {/* Section A: load distribution per algorithm, small multiples */}
            <section className="mb-12">
              <h2 className="text-lg font-black uppercase tracking-tight mb-1">Load Distribution by Algorithm</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Average load % per server, all recorded traffic
              </p>
              {serverLoad.length === 0 ? (
                <p className="text-xs text-slate-400">No data yet — generate some traffic on the dashboard first.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {ALGORITHMS.map((algo) => {
                    const rows = serverLoad.filter((r) => r.algorithm === algo);
                    if (rows.length === 0) return null;
                    return (
                      <div key={algo} className="p-6 rounded-2xl border border-slate-100">
                        <h3 className="text-xs font-black uppercase mb-4" style={{ color: ALGO_COLOR[algo] }}>
                          {algo}
                        </h3>
                        <div className="space-y-3">
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
            </section>

            {/* Section B: algorithm performance comparison - one metric per chart, never dual-axis */}
            <section className="mb-12">
              <h2 className="text-lg font-black uppercase tracking-tight mb-1">Algorithm Performance Comparison</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Aggregate across all recorded traffic
              </p>
              {comparison.length === 0 ? (
                <p className="text-xs text-slate-400">No data yet — generate some traffic on the dashboard first.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Avg Latency</h3>
                    <div className="space-y-3">
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
                  <div className="p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Avg Throughput</h3>
                    <div className="space-y-3">
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
                  <div className="p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Avg Prediction Score</h3>
                    <div className="space-y-3">
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
            </section>

            {/* Section C: overload incidents - sparse counts read best as a table */}
            <section>
              <h2 className="text-lg font-black uppercase tracking-tight mb-1">Overload Incidents</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Samples where server load exceeded 85%
              </p>
              {overloads.length === 0 ? (
                <p className="text-xs text-slate-400">No overload incidents recorded.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="p-4 font-black uppercase text-[10px] text-slate-400">Algorithm</th>
                        <th className="p-4 font-black uppercase text-[10px] text-slate-400">Server</th>
                        <th className="p-4 font-black uppercase text-[10px] text-slate-400 text-right">Incidents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overloads.map((o, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="p-4 font-bold">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: ALGO_COLOR[o.algorithm] }} />
                              {o.algorithm}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500">{o.server_name}</td>
                          <td className="p-4 text-right font-black tabular-nums">{o.overload_incidents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
