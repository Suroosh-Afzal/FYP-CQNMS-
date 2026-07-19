from database.db import get_connection


def server_load_by_algorithm() -> list[dict]:
    """Average/peak load per server, broken down by algorithm."""
    sql = """
        SELECT e.algorithm, s.server_name,
               AVG(CAST(s.load_pct AS FLOAT)) AS avg_load_pct,
               MAX(s.load_pct) AS peak_load_pct,
               COUNT(*) AS samples
        FROM dbo.server_snapshots s
        JOIN dbo.simulation_events e ON e.event_id = s.event_id
        GROUP BY e.algorithm, s.server_name
        ORDER BY e.algorithm, s.server_name
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
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
        conn.close()


def algorithm_comparison() -> list[dict]:
    """Aggregate latency/throughput/prediction comparison across all recorded traffic."""
    sql = """
        SELECT algorithm,
               AVG(latency_ms) AS avg_latency_ms,
               AVG(throughput_pct) AS avg_throughput_pct,
               AVG(prediction_score) AS avg_prediction_score,
               SUM(CASE WHEN system_health = 'Degraded' THEN 1 ELSE 0 END) AS degraded_events,
               COUNT(*) AS total_events
        FROM dbo.simulation_events
        GROUP BY algorithm
        ORDER BY avg_latency_ms
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
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
        conn.close()


def overload_incidents() -> list[dict]:
    """Count of overload incidents (load > 85%) per server per algorithm."""
    sql = """
        SELECT e.algorithm, s.server_name, COUNT(*) AS overload_incidents
        FROM dbo.server_snapshots s
        JOIN dbo.simulation_events e ON e.event_id = s.event_id
        WHERE s.status = 'Overloaded'
        GROUP BY e.algorithm, s.server_name
        ORDER BY overload_incidents DESC
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        return [
            {
                "algorithm": row.algorithm,
                "server_name": row.server_name,
                "overload_incidents": row.overload_incidents,
            }
            for row in cursor.fetchall()
        ]
    finally:
        conn.close()
