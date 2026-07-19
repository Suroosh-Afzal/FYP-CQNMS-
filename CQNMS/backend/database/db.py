import os

DB_ENABLED = os.getenv("DB_ENABLED", "true").lower() != "false"
DB_SERVER = os.getenv("DB_SERVER", r"localhost\SQLEXPRESS")
DB_NAME = os.getenv("DB_NAME", "CQNMS_DB")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
# Windows Authentication (default, used for local runs) has no username/password.
# Set both to switch to SQL Authentication instead - needed from Docker, since a
# Linux container has no Windows identity to present via Trusted_Connection.
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

try:
    import pyodbc
except ImportError as exc:
    # The unixODBC driver manager isn't installed on this machine/image (e.g. the
    # slim Docker image). Degrade to "DB logging off" instead of crashing the API.
    pyodbc = None
    print(f"[DB] pyodbc unavailable, DB logging disabled: {exc}")

_warned = False


def get_connection():
    conn_str = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
    )
    if DB_USER and DB_PASSWORD:
        conn_str += f"UID={DB_USER};PWD={DB_PASSWORD};"
    else:
        conn_str += "Trusted_Connection=yes;"
    return pyodbc.connect(conn_str, timeout=5)


def is_available() -> bool:
    return DB_ENABLED and pyodbc is not None


def log_event(session_id: str, algo: str, intensity: int, stats: dict) -> None:
    """Persist one simulation snapshot (event + its per-server rows) to SQL Server.

    Runs as a FastAPI background task, after the response has already been sent,
    so a slow or unreachable database never adds latency to the live dashboard.
    Any failure is logged once and swallowed - the in-memory simulation must keep
    working even if SQL Server is down or DB_ENABLED=false.
    """
    global _warned
    if not DB_ENABLED or pyodbc is None:
        return

    try:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO dbo.simulation_events
                    (session_id, algorithm, intensity, latency_ms, throughput_pct, prediction_score, system_health)
                OUTPUT INSERTED.event_id
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                session_id,
                algo,
                intensity,
                stats["latency"],
                stats["throughput"],
                stats["prediction"],
                stats["system_health"],
            )
            event_id = cursor.fetchone()[0]

            cursor.executemany(
                """
                INSERT INTO dbo.server_snapshots (event_id, server_name, load_pct, status)
                VALUES (?, ?, ?, ?)
                """,
                [(event_id, s["name"], s["load"], s["status"]) for s in stats["servers"]],
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        if not _warned:
            print(f"[DB] Event logging failed, further failures will be silent: {exc}")
            _warned = True
