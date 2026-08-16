import os
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from core.engine import session_manager
from database import db, reports

app = FastAPI(title="CQNMS Advanced Engine v2.1")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)

Algorithm = Literal["Round Robin", "SJF", "Priority", "Least Loaded"]

@app.get("/api/stats")
async def read_stats(
    background_tasks: BackgroundTasks,
    algo: Algorithm = Query("Round Robin"),
    intensity: int = Query(1000, ge=0, le=5000),
    session_id: str = Query("default"),
):
    """
    Main Endpoint for Frontend Dashboard
    """
    engine = session_manager.get(session_id)
    stats = engine.get_stats(algo, intensity)
    background_tasks.add_task(db.log_event, session_id, algo, intensity, stats)
    return stats

@app.get("/health")
async def health_check():
    return {"status": "optimized", "engine": "active", "version": "2.1-AI-Enabled"}

def _require_db():
    if not db.is_available():
        raise HTTPException(status_code=503, detail="Database logging is not enabled/reachable")

def _since(since_minutes: int | None) -> datetime | None:
    if since_minutes is None:
        return None
    return datetime.now(timezone.utc) - timedelta(minutes=since_minutes)

@app.get("/api/reports/server-load")
async def report_server_load(since_minutes: int | None = Query(None, ge=1)):
    _require_db()
    return await run_in_threadpool(reports.server_load_by_algorithm, _since(since_minutes))

@app.get("/api/reports/algorithm-comparison")
async def report_algorithm_comparison(since_minutes: int | None = Query(None, ge=1)):
    _require_db()
    return await run_in_threadpool(reports.algorithm_comparison, _since(since_minutes))

@app.get("/api/reports/overload-incidents")
async def report_overload_incidents(since_minutes: int | None = Query(None, ge=1)):
    _require_db()
    return await run_in_threadpool(reports.overload_incidents, _since(since_minutes))