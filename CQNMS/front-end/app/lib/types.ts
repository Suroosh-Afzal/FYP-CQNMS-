export type Algorithm = "Round Robin" | "SJF" | "Priority" | "Least Loaded";

export interface ServerStat {
  id: number;
  name: string;
  load: number;
  status: string;
}

export interface LogEntry {
  timestamp: string;
  algo: string;
  message: string;
}

export interface Stats {
  active_algo: string;
  traffic: number;
  latency: number;
  throughput: number;
  prediction: number;
  servers: ServerStat[];
  logs: LogEntry[];
  system_health: string;
}

export interface ServerLoadReportRow {
  algorithm: string;
  server_name: string;
  avg_load_pct: number;
  peak_load_pct: number;
  samples: number;
}

export interface AlgorithmComparisonRow {
  algorithm: string;
  avg_latency_ms: number;
  avg_throughput_pct: number;
  avg_prediction_score: number;
  degraded_events: number;
  total_events: number;
}

export interface OverloadIncidentRow {
  algorithm: string;
  server_name: string;
  overload_incidents: number;
}
