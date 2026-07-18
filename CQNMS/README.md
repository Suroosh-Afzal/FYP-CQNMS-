# CQNMS Engine

CQNMS (Cluster Queue &amp; Network Management System) is a simulated load-balancing dashboard. It models traffic being routed across four servers under different scheduling algorithms — **Round Robin**, **SJF**, **Priority**, and **Least Loaded** — and visualizes live load, latency, throughput, and predicted stress trends.

This is a demo/simulation engine: server load, latency, and throughput are synthesized in-memory (see `backend/core/engine.py`), not measured from real infrastructure.

## Features

- **Dashboard** (`/`) — traffic intensity slider, algorithm selector, live network topology, per-server health, and execution logs.
- **Algorithm Arena** (`/arena`) — side-by-side live comparison of all four scheduling algorithms at fixed intensity.
- **Innovation / R&amp;D Node** (`/innovation`) — predictive stress score based on recent traffic trend.

## Architecture

```
CQNMS/
  backend/            FastAPI service — in-memory simulation engine
    api/main.py       /api/stats and /health endpoints
    core/engine.py     CQNMSEngine: load/latency/throughput simulation
  front-end/          Next.js (App Router) dashboard
    app/page.tsx        Main dashboard
    app/arena/           Algorithm Arena
    app/innovation/      Predictive analysis page
    app/components/      Sidebar, StatsPanel, NetworkMap, ComparisonCard
    app/lib/api.ts        Shared API base URL helper
  docker-compose.yml
```

There is no database — engine state resets whenever the backend process restarts.

## Running with Docker (recommended)

```bash
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

## Running locally

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend**

```bash
cd front-end
cp .env.example .env.local   # adjust NEXT_PUBLIC_API_URL if needed
npm install
npm run dev
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/stats?algo=<name>&intensity=<n>` | Live simulated stats for the given algorithm and traffic intensity |
| `GET /health` | Health check |

`algo` accepts: `Round Robin`, `SJF`, `Priority`, `Least Loaded`.
