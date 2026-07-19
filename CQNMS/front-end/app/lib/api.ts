import type {
  AlgorithmComparisonRow,
  OverloadIncidentRow,
  ServerLoadReportRow,
  Stats,
} from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SESSION_KEY = "cqnms_session_id";

// One id per browser tab, so concurrent tabs on different algos/intensities
// each get their own trend history and logs on the backend instead of
// sharing (and stomping on) a single global engine.
function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function fetchStats(
  algo: string,
  intensity: number,
  signal?: AbortSignal
): Promise<Stats> {
  const params = new URLSearchParams({
    algo,
    intensity: String(intensity),
    session_id: getSessionId(),
  });
  const res = await fetch(`${API_BASE_URL}/api/stats?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Backend responded with ${res.status}`);
  }
  return res.json();
}

// Thrown by the report fetchers specifically on a 503, so the Reports page can
// tell "database not connected" apart from a generic network/backend failure.
export class DatabaseUnavailableError extends Error {}

async function fetchReport<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (res.status === 503) {
    throw new DatabaseUnavailableError("Database logging is not enabled/reachable");
  }
  if (!res.ok) {
    throw new Error(`Backend responded with ${res.status}`);
  }
  return res.json();
}

export function fetchServerLoadReport(signal?: AbortSignal) {
  return fetchReport<ServerLoadReportRow[]>("/api/reports/server-load", signal);
}

export function fetchAlgorithmComparisonReport(signal?: AbortSignal) {
  return fetchReport<AlgorithmComparisonRow[]>("/api/reports/algorithm-comparison", signal);
}

export function fetchOverloadIncidentsReport(signal?: AbortSignal) {
  return fetchReport<OverloadIncidentRow[]>("/api/reports/overload-incidents", signal);
}
