# TransitOps — Backend (Smart Transport Operations Platform)

A production-ready, race-condition-safe backend for fleet/dispatch/maintenance/expense
management. Node.js + Express + PostgreSQL (Prisma) + Redis (BullMQ + caching) + Socket.IO.

## Highlights

- **JWT auth + RBAC** (`ADMIN`, `FLEET_MANAGER`, `DRIVER`, `VIEWER`), refresh-token rotation.
- **Zero race conditions on core workflows** — every rule from the concurrency checklist is
  handled explicitly. See [`docs/CONCURRENCY.md`](docs/CONCURRENCY.md) for the full map and
  `tests/dispatch.race.test.js` for a live regression test.
- **AI Dispatch Recommendation** — explainable weighted-scoring engine suggesting the best
  vehicle + driver for a trip (`POST /api/dispatch/recommend`).
- **Real-time dashboard** via Socket.IO (`vehicle.updated`, `driver.updated`, `trip.updated`,
  `maintenance.updated`, `notification.new`).
- **Predictive maintenance alerts** — cron job flags vehicles due for service based on
  odometer since last service vs. configurable interval.
- **Batched notifications** via BullMQ (Redis) to avoid notification spam.
- **Full audit trail**, CSV export with consistent snapshots, optimistic + pessimistic
  locking, Dockerized deployment.

## Tech stack

Node.js 20, Express, PostgreSQL 16, Prisma ORM, Redis 7, BullMQ, Socket.IO, JWT, bcrypt,
express-validator, Pino logging, Docker/Docker Compose.

## Quick start (Docker — recommended)

```bash
cp .env.example .env
# edit .env: set real JWT secrets, change SEED_ADMIN_PASSWORD

docker-compose up --build
```

This starts Postgres, Redis, runs migrations + seed, then starts the API (port 4000) and
the notification worker. Login with the seeded admin (`SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` from `.env`, default `admin@transitops.local` / `Admin@12345` —
**change immediately**).

## Quick start (local, without Docker)

Requires Node 20+, a running PostgreSQL instance, and Redis (optional — the app degrades
gracefully without Redis: notifications/caching are skipped but core business logic still
works).

```bash
npm install
cp .env.example .env   # set DATABASE_URL to your local Postgres

npx prisma migrate dev --name init
npm run prisma:seed

npm run dev             # API with reload
# in a second terminal, only if you want notifications processed out-of-process:
npm run worker
```

## Project structure

```
src/
  app.js               Express app (middleware, routes)
  server.js             HTTP server, Socket.IO, cron jobs, worker bootstrap
  config/                db (Prisma), redis, logger
  middleware/             auth, rbac, validate, error handling, idempotency
  utils/                  jwt, apiError, apiResponse, txLock (the concurrency core)
  sockets/                Socket.IO server + redis pub/sub bridge
  queues/                 BullMQ notification queue + worker (batches spam)
  jobs/                   cron: license expiry, predictive maintenance
  modules/
    auth/            drivers/       maintenance/     dispatch/ (AI recommend)
    vehicles/        trips/         fuel/            analytics/ (KPIs, CSV)
    documents/        users/        expenses/         audit/
prisma/
  schema.prisma       seed.js
docs/
  CONCURRENCY.md       full race-condition -> implementation map
tests/
  dispatch.race.test.js  concurrent-dispatch regression test
```

## API overview

All endpoints are prefixed `/api`. Authenticated endpoints require
`Authorization: Bearer <accessToken>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Users (admin) | `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/active` |
| Vehicles | `GET/POST /vehicles`, `GET/PATCH /vehicles/:id`, `POST /vehicles/:id/retire`, `POST/GET /vehicles/:id/documents` |
| Drivers | `GET/POST /drivers`, `GET/PATCH /drivers/:id`, `POST /drivers/:id/suspend`, `POST /drivers/:id/reinstate` |
| Trips | `GET/POST /trips`, `GET /trips/:id`, `POST /trips/:id/dispatch`, `POST /trips/:id/complete`, `POST /trips/:id/cancel` |
| Maintenance | `GET/POST /maintenance`, `POST /maintenance/:id/close` |
| Fuel logs | `GET/POST /fuel-logs`, `PATCH /fuel-logs/:id` (optimistic-locked) |
| Expenses | `GET/POST /expenses` |
| AI Dispatch | `POST /dispatch/recommend` |
| Analytics | `GET /analytics/dashboard`, `/fleet-utilization`, `/fuel-efficiency`, `/operational-cost`, `/roi`, `/idle-vehicles`, `/cost-trends`, `/predictive-maintenance`, `/export/trips.csv` |
| Audit | `GET /audit-logs` |

Every mutating request is protected by RBAC (`ADMIN` / `FLEET_MANAGER` for writes,
depending on the resource); read endpoints are open to any authenticated role.

Example: dispatch a trip safely under concurrency, with idempotency:

```bash
curl -X POST http://localhost:4000/api/trips/<tripId>/dispatch \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: <uuid-per-click>"
```

## Real-time events (Socket.IO)

Connect with `io(url, { auth: { token: accessToken } })`, then listen on room `dashboard`
(joined automatically) for: `vehicle.updated`, `driver.updated`, `trip.updated`,
`maintenance.updated`, `fuel.updated`, `expense.updated`, `notification.new`.

## Running the race-condition test

```bash
docker-compose up -d postgres redis
npx prisma migrate deploy
DATABASE_URL=... npm test
```

`tests/dispatch.race.test.js` fires two concurrent dispatch requests for the same vehicle
and asserts exactly one succeeds (200) and the other is rejected (409) — proving rule #1
("two managers dispatch the same vehicle simultaneously") cannot produce the impossible
double-dispatched state.

## Deployment notes

- Run `npx prisma migrate deploy` (not `migrate dev`) in production/CI.
- Set strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (32+ random chars).
- Put the API behind a reverse proxy / load balancer terminating TLS; `trust proxy` is
  already enabled for correct client IPs behind a proxy.
- Scale the API horizontally; the notification worker and Socket.IO bridge use Redis
  pub/sub so real-time events reach clients regardless of which API instance emitted them.
- `uploads/` should be mounted to persistent/shared storage (or swapped for S3-compatible
  storage) in a multi-instance deployment.
