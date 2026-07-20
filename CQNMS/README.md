# CQNMS Engine

CQNMS (Cluster Queue &amp; Network Management System) is a simulated load-balancing dashboard. It models traffic being routed across four servers under different scheduling algorithms — **Round Robin**, **SJF**, **Priority**, and **Least Loaded** — and visualizes live load, latency, throughput, and predicted stress trends.

This is a demo/simulation engine: server load, latency, and throughput are synthesized in-memory (see `backend/core/engine.py`), not measured from real infrastructure. Every simulated request is also persisted to SQL Server for the Reports page.

**Setting up on a new machine?** See [`SETUP.md`](./SETUP.md) for the full step-by-step guide (prerequisites, SQL Server setup, troubleshooting).

## Features

- **Dashboard** (`/`) — traffic intensity slider, algorithm selector, live network topology, per-server health, and execution logs.
- **Algorithm Arena** (`/arena`) — side-by-side live comparison of all four scheduling algorithms at fixed intensity.
- **Innovation / R&amp;D Node** (`/innovation`) — predictive stress score based on recent traffic trend.
- **Reports** (`/reports`) — historical analytics queried from SQL Server: load distribution per algorithm, performance comparison, overload incidents.

## Architecture

```
CQNMS/
  backend/            FastAPI service — in-memory simulation engine + SQL Server audit log
    api/main.py         /api/stats, /api/reports/*, and /health endpoints
    core/engine.py       CQNMSEngine: load/latency/throughput simulation
    database/
      schema.sql           creates the CQNMS_DB database + tables
      db.py                writes each simulated request to SQL Server
      reports.py           queries behind the Reports page
  front-end/          Next.js (App Router) dashboard
    app/page.tsx        Main dashboard
    app/arena/           Algorithm Arena
    app/innovation/      Predictive analysis page
    app/reports/          Reports page
    app/components/      Sidebar, StatsPanel, NetworkMap, ComparisonCard, ReportBar
    app/lib/api.ts        Shared API base URL + fetch helpers
  docker-compose.yml
```

Server load/latency/prediction state itself resets when the backend process restarts (it's in-memory), but every request is logged to SQL Server, so historical data in the Reports page survives restarts.

## Running with Docker (recommended)

Requires a one-time SQL Server setup first — see [`SETUP.md`](./SETUP.md).

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
| `GET /api/reports/server-load` | Average/peak load per server, per algorithm |
| `GET /api/reports/algorithm-comparison` | Aggregate latency/throughput/prediction comparison |
| `GET /api/reports/overload-incidents` | Overload incident counts per server per algorithm |
| `GET /health` | Health check |

`algo` accepts: `Round Robin`, `SJF`, `Priority`, `Least Loaded`. Report endpoints return `503` if SQL Server logging isn't enabled/reachable.
