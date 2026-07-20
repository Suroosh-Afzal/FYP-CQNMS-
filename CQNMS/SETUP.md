# CQNMS — Setup Guide (New Machine)

Follow these steps in order on a fresh laptop to get the full system running —
live dashboard, algorithm arena, predictive analysis, and the SQL Server-backed
Reports page — for a supervisor demo.

## 1. Prerequisites (install these first)

| Tool | Why | Notes |
|---|---|---|
| **Git** | Clone the repo | https://git-scm.com |
| **Docker Desktop** | Runs the whole app with one command | Enable the WSL2 backend on Windows. Give it at least 4 GB RAM (Settings → Resources) to avoid containers being OOM-killed. |
| **SQL Server Express** | Stores the audit-log data behind the Reports page | https://www.microsoft.com/sql-server/sql-server-downloads — the free "Express" edition is enough |
| **SQL Server Management Studio (SSMS)** | Used to run the setup scripts and inspect data | https://aka.ms/ssmsfullsetup |

Node.js and Python are **not required** on the host — Docker builds them inside
the containers. Only install them locally if you plan to run the backend/frontend
outside Docker (see §6).

## 2. Clone the repo

```bash
git clone https://github.com/Suroosh-Afzal/FYP-CQNMS-.git
cd FYP-CQNMS-
git checkout main
cd CQNMS
```

All commands below are run from this `CQNMS/` folder unless noted otherwise.

## 3. One-time SQL Server setup

This has to be done once per machine — Docker's Linux container can't use
Windows Authentication, so it needs a SQL login and a TCP port to connect
through instead.

### 3.1 Create the database and tables

Open **SSMS**, connect with Windows Authentication, open
`backend/database/schema.sql`, and run it (F5). This creates the `CQNMS_DB`
database with the `simulation_events` and `server_snapshots` tables.

### 3.2 Enable Mixed Mode Authentication

In SSMS: right-click the server name (top of Object Explorer) → **Properties**
→ **Security** page → select **"SQL Server and Windows Authentication mode"**
→ OK.

### 3.3 Enable TCP/IP and set a static port

Open **PowerShell as Administrator** (search "PowerShell" → right-click → Run
as Administrator) and paste this block. Adjust `MSSQL16.SQLEXPRESS` if your
instance name differs (check with
`Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"`).

```powershell
$tcpPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp"
Set-ItemProperty -Path $tcpPath -Name "Enabled" -Value 1
Set-ItemProperty -Path "$tcpPath\IPAll" -Name "TcpPort" -Value "1433"
Set-ItemProperty -Path "$tcpPath\IPAll" -Name "TcpDynamicPorts" -Value ""

Restart-Service "MSSQL`$SQLEXPRESS" -Force

New-NetFirewallRule -DisplayName "SQL Server TCP 1433 (CQNMS Docker)" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow -ErrorAction SilentlyContinue
```

**If PowerShell refuses to run a `.ps1` file** ("running scripts is disabled"),
paste the commands directly into the console instead of saving/running them as
a file — that restriction only applies to script files, not pasted commands.

### 3.4 Create the app's SQL login

In SSMS, open `backend/database/create_docker_login.sql`. Replace
`CHANGE_ME_STRONG_PASSWORD` with a real password, then run it (F5). This
creates a `cqnms_app` login with read/write access to `CQNMS_DB` only.

**Write this password down** — you need it in the next step.

## 4. Environment file

```bash
cp .env.example .env
```

Edit the new `CQNMS/.env` and set:

```
DB_PASSWORD=<the password you set in step 3.4>
```

This file is gitignored — never commit it.

## 5. Run everything

```bash
docker compose up --build
```

First build takes a few minutes (installs the SQL Server ODBC driver). Once
you see `Uvicorn running on http://0.0.0.0:8000` and the Next.js "Ready" line,
open:

- **http://localhost:3000** — the dashboard
- **http://localhost:3000/reports** — SQL-backed reports (generate some
  traffic on the dashboard first, data appears within ~5s)
- **http://localhost:8000/health** — should return `{"status":"optimized",...}`

To stop: `Ctrl+C`, or `docker compose down` from another terminal.

## 6. Running without Docker (optional, for local development)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # leave DB_USER/DB_PASSWORD blank - uses Windows Auth locally
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd front-end
cp .env.example .env.local
npm install
npm run dev
```

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Backend container exits immediately, log shows `pyodbc.Error: ... driver not found` | Image wasn't rebuilt after a Dockerfile change | `docker compose build --no-cache backend` then `docker compose up -d` |
| Reports page shows "DATABASE NOT CONNECTED" (503 in browser console) | `.env` missing/wrong password, or SQL Server setup (§3) not done | Check `CQNMS/.env` has the right `DB_PASSWORD`; verify with `sqlcmd -S localhost,1433 -U cqnms_app -P <password> -Q "SELECT 1"` |
| `Login failed for user 'cqnms_app'` | Password in `.env` doesn't match the SQL login | Reset it: `sqlcmd -S localhost\SQLEXPRESS -E -Q "ALTER LOGIN cqnms_app WITH PASSWORD = 'newpassword'"`, then update `.env` to match |
| Frontend shows "Backend Unreachable" | Backend container isn't running, or CORS origin mismatch | `docker ps` to check it's Up; confirm you're opening `localhost:3000` (not `127.0.0.1`) since `FRONTEND_ORIGIN` is set to `http://localhost:3000` |
| Container randomly exits with code `137` | Docker ran out of memory (OOM-killed) | Docker Desktop → Settings → Resources → raise memory limit; close other heavy apps |
| PowerShell registry commands fail with "Access is denied" | Not running as Administrator | Re-open PowerShell via "Run as Administrator" |
| Port `1433`/`8000`/`3000` already in use | Another process is using it | `Get-NetTCPConnection -LocalPort <port>` to find it, stop that process, or change the port in `docker-compose.yml` |

## What's Where

```
CQNMS/
  backend/            FastAPI service (simulation engine + SQL Server audit log)
    database/
      schema.sql              creates CQNMS_DB + tables (§3.1)
      create_docker_login.sql creates the cqnms_app SQL login (§3.4)
      sample_queries.sql      example reports to run directly in SSMS
  front-end/          Next.js dashboard (dashboard, arena, innovation, reports)
  docker-compose.yml  runs both services together
  .env.example        copy to .env, fill in DB_PASSWORD (§4)
```
