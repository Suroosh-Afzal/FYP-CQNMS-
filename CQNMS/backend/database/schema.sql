-- CQNMS Audit Log Schema
-- Run this in SQL Server Management Studio (SSMS) to create the database and tables.

-- 1. Create the database (skip this block if you already created one in SSMS)
IF DB_ID('CQNMS_DB') IS NULL
BEGIN
    CREATE DATABASE CQNMS_DB;
END
GO

USE CQNMS_DB;
GO

-- 2. One row per /api/stats call (one "poll") - the aggregate metrics at that moment
IF OBJECT_ID('dbo.simulation_events', 'U') IS NOT NULL
    DROP TABLE dbo.server_snapshots; -- drop child first (FK dependency)
IF OBJECT_ID('dbo.simulation_events', 'U') IS NOT NULL
    DROP TABLE dbo.simulation_events;
GO

CREATE TABLE dbo.simulation_events (
    event_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    session_id        VARCHAR(64)     NOT NULL,
    event_time        DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    algorithm         VARCHAR(20)     NOT NULL
                       CONSTRAINT chk_algorithm CHECK (algorithm IN ('Round Robin', 'SJF', 'Priority', 'Least Loaded')),
    intensity         INT             NOT NULL,
    latency_ms        DECIMAL(6,2)    NOT NULL,
    throughput_pct    TINYINT         NOT NULL,
    prediction_score  DECIMAL(4,2)    NOT NULL,
    system_health     VARCHAR(20)     NOT NULL
);
GO

-- 3. One row per server, per event - the per-server load at that same moment
--    (normalized out of simulation_events so we can query per-server history easily)
CREATE TABLE dbo.server_snapshots (
    snapshot_id   BIGINT IDENTITY(1,1) PRIMARY KEY,
    event_id      BIGINT       NOT NULL
                  CONSTRAINT fk_snapshot_event REFERENCES dbo.simulation_events(event_id) ON DELETE CASCADE,
    server_name   VARCHAR(10)  NOT NULL,
    load_pct      TINYINT      NOT NULL,
    status        VARCHAR(20)  NOT NULL
);
GO

-- 4. Indexes for the report queries we'll actually run
--    (per-session timelines, per-algorithm comparisons, per-event server lookups)
CREATE INDEX idx_events_session_time ON dbo.simulation_events (session_id, event_time);
CREATE INDEX idx_events_algo_time    ON dbo.simulation_events (algorithm, event_time);
CREATE INDEX idx_snapshots_event     ON dbo.server_snapshots (event_id);
GO
