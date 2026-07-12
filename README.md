# TransitOps — Smart Transport Operations Platform

Full-stack project: a race-condition-safe backend (Node/Express/PostgreSQL/Redis) and a
React frontend with a live, animated Vanta.js network background.

```
transitops/
  backend/     API — auth, vehicles, drivers, trips, maintenance, fuel, expenses,
               AI dispatch recommendation, analytics, audit log, Socket.IO, cron jobs
  frontend/    React (Vite) app — landing, auth, and every module's UI, wired to the
               backend over REST + Socket.IO
  docker-compose.yml   runs the ENTIRE stack (Postgres, Redis, API, worker, frontend) in one command
```

See `backend/README.md` and `frontend/README.md` for full details on each half. This file
covers running everything together.

## Run everything with one command

```bash
cp backend/.env.example backend/.env
# edit backend/.env: set real JWT secrets and change the seed admin password

docker-compose up --build
```

This starts, in order: Postgres → Redis → migrations + seed → the API (port **4000**) and
notification worker → the frontend, served by nginx on port **8080**.

Open **http://localhost:8080** — you'll land on the Vanta.js network background landing
page. Sign in with the seeded admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
from `backend/.env`, default `admin@transitops.local` / `Admin@12345` — change this
immediately after first login via the Users page).

## Run without Docker (local development)

Terminal 1 — backend:
```bash
cd backend
npm install
cp .env.example .env   # point DATABASE_URL at your local Postgres
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev              # http://localhost:4000
```

Terminal 2 — frontend:
```bash
cd frontend
npm install
cp .env.example .env    # defaults already point at http://localhost:4000
npm run dev               # http://localhost:5173
```

Redis is optional locally — the backend degrades gracefully without it (notifications and
the analytics cache are skipped, but every business rule and race-condition protection
still works exactly the same, since those are enforced at the database transaction level,
not through Redis).

## What's inside

**Backend** — every race-condition rule (double dispatch, double driver assignment, lost
updates, deadlocks, stale dashboards, notification spam, CSV-export-mid-update, etc.) is
handled explicitly via row-level locking + fixed lock ordering + optimistic versioning
inside single database transactions. Full map: `backend/docs/CONCURRENCY.md`. A live
regression test proves it: `backend/tests/dispatch.race.test.js`.

**Frontend** — full app: dashboard with live KPIs, vehicles (+ documents), drivers, trips
(draft → dispatch → complete → cancel), an explainable AI dispatch recommendation engine,
maintenance, fuel logs (optimistically-locked edits), expenses, analytics (charts + CSV
export), audit log, and admin user management. Every list updates in real time over
Socket.IO instead of polling. Landing/login/register pages use the Vanta.js `NET`
animated background.

## Deployment

- Run behind a reverse proxy (nginx/Caddy/Cloudflare) terminating TLS for both the `api`
  and `frontend` services.
- Set `CORS_ORIGIN` in `backend/.env` to your real frontend origin in production.
- Build the frontend with `VITE_API_URL` / `VITE_SOCKET_URL` pointing at your deployed
  backend's public URL (see the `frontend` build args in `docker-compose.yml`).
- Scale `api` and `worker` independently; both share state via Postgres + Redis, so either
  can run multiple replicas behind a load balancer.
