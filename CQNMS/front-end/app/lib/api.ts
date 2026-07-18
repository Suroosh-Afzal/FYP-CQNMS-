import type { Stats } from "./types";

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
