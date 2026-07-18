from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from core.engine import engine # Import the instance

app = FastAPI(title="CQNMS Advanced Engine v2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/stats")
async def read_stats(algo: str = Query("Round Robin"), intensity: int = Query(1000)):
    """
    Main Endpoint for Frontend Dashboard
    """
    return engine.get_stats(algo, intensity)

@app.get("/health")
async def health_check():
    return {"status": "optimized", "engine": "active", "version": "2.1-AI-Enabled"}