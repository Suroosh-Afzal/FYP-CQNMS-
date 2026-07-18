import os
from typing import Literal
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from core.engine import session_manager

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
    algo: Algorithm = Query("Round Robin"),
    intensity: int = Query(1000, ge=0, le=5000),
    session_id: str = Query("default"),
):
    """
    Main Endpoint for Frontend Dashboard
    """
    engine = session_manager.get(session_id)
    return engine.get_stats(algo, intensity)

@app.get("/health")
async def health_check():
    return {"status": "optimized", "engine": "active", "version": "2.1-AI-Enabled"}