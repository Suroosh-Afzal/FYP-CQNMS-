# CQNMS Front-end

Next.js (App Router) dashboard for the CQNMS load-balancing simulator. See the [project README](../README.md) for the full architecture and how to run the backend alongside this app.

## Getting Started

```bash
cp .env.example .env.local   # adjust NEXT_PUBLIC_API_URL if the backend isn't on localhost:8000
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be running on the URL configured in `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

## Structure

- `app/page.tsx` — main dashboard
- `app/arena/` — Algorithm Arena (live comparison across algorithms)
- `app/innovation/` — predictive analysis page
- `app/components/` — Sidebar, StatsPanel, NetworkMap, ComparisonCard
- `app/lib/api.ts` — shared `API_BASE_URL` helper

## Production build

```bash
npm run build
npm run start
```
