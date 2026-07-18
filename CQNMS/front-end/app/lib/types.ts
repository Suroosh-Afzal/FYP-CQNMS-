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
