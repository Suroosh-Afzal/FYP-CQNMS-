from datetime import datetime, timezone

from database.db import acquire_connection, release_connection


def _utc_naive(since: datetime) -> datetime:
    """SQL Server DATETIME2 columns here are naive UTC (SYSUTCDATETIME()) - strip any
    tzinfo so pyodbc binds a plain timestamp instead of an offset-aware one."""
    if since.tzinfo is not None:
        since = since.astimezone(timezone.utc).replace(tzinfo=None)
    return since


def server_load_by_algorithm(since: datetime | None = None) -> list[dict]:
    """Average/peak load per server, broken down by algorithm."""
    sql = """
        SELECT e.algorithm, s.server_name,
               AVG(CAST(s.load_pct AS FLOAT)) AS avg_load_pct,
               MAX(s.load_pct) AS peak_load_pct,
               COUNT(*) AS samples
        FROM dbo.server_snapshots s
        JOIN dbo.simulation_events e ON e.event_id = s.event_id
    """
    params: list = []
    if since is not None:
        sql += " WHERE e.event_time >= ?"
        params.append(_utc_naive(since))
    sql += " GROUP BY e.algorithm, s.server_name ORDER BY e.algorithm, s.server_name"

    conn = acquire_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [
            {
                "algorithm": row.algorithm,
                "server_name": row.server_name,
                "avg_load_pct": round(row.avg_load_pct, 1),
                "peak_load_pct": row.peak_load_pct,
                "samples": row.samples,
            }
            for row in cursor.fetchall()
        ]
    finally:
        release_connection(conn)


def algorithm_comparison(since: datetime | None = None) -> list[dict]:
    """Aggregate latency/throughput/prediction comparison across recorded traffic."""
    sql = """
        SELECT algorithm,
               AVG(latency_ms) AS avg_latency_ms,
               AVG(throughput_pct) AS avg_throughput_pct,
               AVG(prediction_score) AS avg_prediction_score,
               SUM(CASE WHEN system_health = 'Degraded' THEN 1 ELSE 0 END) AS degraded_events,
               COUNT(*) AS total_events
        FROM dbo.simulation_events
    """
    params: list = []
    if since is not None:
        sql += " WHERE event_time >= ?"
        params.append(_utc_naive(since))
    sql += " GROUP BY algorithm ORDER BY avg_latency_ms"

    conn = acquire_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [
            {
                "algorithm": row.algorithm,
                "avg_latency_ms": round(row.avg_latency_ms, 2),
                "avg_throughput_pct": round(row.avg_throughput_pct, 1),
                "avg_prediction_score": round(row.avg_prediction_score, 2),
                "degraded_events": row.degraded_events,
                "total_events": row.total_events,
            }
            for row in cursor.fetchall()
        ]
    finally:
        release_connection(conn)


def overload_incidents(since: datetime | None = None) -> list[dict]:
    """Count of overload incidents (load > 85%) per server per algorithm."""
    sql = """
        SELECT e.algorithm, s.server_name, COUNT(*) AS overload_incidents
        FROM dbo.server_snapshots s
        JOIN dbo.simulation_events e ON e.event_id = s.event_id
        WHERE s.status = 'Overloaded'
    """
    params: list = []
    if since is not None:
        sql += " AND e.event_time >= ?"
        params.append(_utc_naive(since))
    sql += " GROUP BY e.algorithm, s.server_name ORDER BY overload_incidents DESC"

    conn = acquire_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return [
            {
                "algorithm": row.algorithm,
                "server_name": row.server_name,
                "overload_incidents": row.overload_incidents,
            }
            for row in cursor.fetchall()
        ]
    finally:
        release_connection(conn)
