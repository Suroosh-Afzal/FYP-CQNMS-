-- Example reports you'll be able to run once the backend is writing to CQNMS_DB.
-- These directly answer the questions raised in the FYP-1 meeting.

USE CQNMS_DB;
GO

-- Q: "Which server does the least work, under which algorithm?"
-- Average load per server, broken down by algorithm.
SELECT
    e.algorithm,
    s.server_name,
    AVG(CAST(s.load_pct AS FLOAT)) AS avg_load_pct,
    MAX(s.load_pct)                AS peak_load_pct,
    COUNT(*)                       AS samples
FROM dbo.server_snapshots s
JOIN dbo.simulation_events e ON e.event_id = s.event_id
GROUP BY e.algorithm, s.server_name
ORDER BY e.algorithm, s.server_name;
GO

-- Q: "Under each algorithm, when did load arrive and how did it respond?"
-- Full audit trail for one session, in time order (swap in a real session_id).
SELECT
    e.event_time,
    e.algorithm,
    e.intensity,
    e.latency_ms,
    e.throughput_pct,
    e.prediction_score,
    e.system_health,
    s.server_name,
    s.load_pct,
    s.status
FROM dbo.simulation_events e
JOIN dbo.server_snapshots s ON s.event_id = e.event_id
WHERE e.session_id = 'PASTE_SESSION_ID_HERE'
ORDER BY e.event_time, s.server_name;
GO

-- Q: "Which algorithm performs best overall?"
-- Aggregate comparison across all recorded traffic.
SELECT
    algorithm,
    AVG(latency_ms)       AS avg_latency_ms,
    AVG(throughput_pct)   AS avg_throughput_pct,
    AVG(prediction_score) AS avg_prediction_score,
    SUM(CASE WHEN system_health = 'Degraded' THEN 1 ELSE 0 END) AS degraded_events,
    COUNT(*) AS total_events
FROM dbo.simulation_events
GROUP BY algorithm
ORDER BY avg_latency_ms;
GO

-- Q: "If all servers get hit with load at once, which one overloads?"
-- Overload incident count per server per algorithm (load_pct > 85).
SELECT
    e.algorithm,
    s.server_name,
    COUNT(*) AS overload_incidents
FROM dbo.server_snapshots s
JOIN dbo.simulation_events e ON e.event_id = s.event_id
WHERE s.status = 'Overloaded'
GROUP BY e.algorithm, s.server_name
ORDER BY overload_incidents DESC;
GO
