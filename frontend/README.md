# TransitOps — Frontend

Full React (Vite) frontend for the TransitOps backend: landing page with the animated
Vanta.js network background, auth, and every module (vehicles, drivers, trips, dispatch AI,
maintenance, fuel, expenses, analytics, audit, users) wired to the API in real time via
Socket.IO.

## Design

- **Palette**: near-black void (`#06080D`) with an amber "beacon" accent (`#F2C879`) —
  the visual language of a control tower tracking a fleet at night.
- **Type**: Space Grotesk (display), Inter (body), JetBrains Mono (data/telemetry figures).
- **Signature element**: the "beacon ticker" — a live marquee of real fleet stats (vehicles
  on route, utilization %) that updates the moment a trip dispatches, tying the "real-time
  network" thesis to an actual number rather than decoration.
- **Background**: Vanta.js `NET` effect on the landing, login, and register screens,
  configured to match the reference exactly — `color: 0xf2e4e9`, `backgroundColor: 0x0`,
  `points: 20`, `maxDistance: 10`, `spacing: 20`, `showDots: true`. Loaded from CDN
  (`three.js r134` + `vanta.net.min.js`) at runtime, not bundled.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL / VITE_SOCKET_URL at your backend
npm run dev             # http://localhost:5173
```

Requires the TransitOps backend running (see the backend's own README/docker-compose).
CORS on the backend must allow this frontend's origin (`CORS_ORIGIN` in the backend `.env`).

## Build & deploy

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

`dist/` is a static bundle — deploy it to any static host (Vercel, Netlify, S3+CloudFront,
Nginx). Set `VITE_API_URL` / `VITE_SOCKET_URL` as build-time env vars pointing at your
deployed backend.

## Structure

```
src/
  api/            axios client (auto token-refresh), per-module API calls
  context/        Auth, Socket.IO, Toast providers
  components/
    ui/            Button/Input/Modal/Table primitives, StatusPill, StatCard
    crud/           generic ResourceListPage + ResourceFormModal (powers 5 modules)
    layout/         Sidebar, Topbar, AppLayout
    VantaBackground.jsx   the network background component
    BeaconTicker.jsx       live fleet stats marquee (signature element)
  pages/
    Landing, Login, Register
    Dashboard, Vehicles, Drivers, Trips, DispatchRecommend,
    Maintenance, Fuel, Expenses, Analytics, Audit, Users
```

## Notes

- Auth uses a short-lived access token held in memory + an httpOnly refresh-token cookie
  (matches the backend's rotation scheme); a 401 triggers a silent refresh-and-retry.
- Role-gated UI: `FLEET_MANAGER`/`ADMIN` see create/edit/action controls; `VIEWER`/`DRIVER`
  see read-only views. The backend re-enforces every rule regardless of what the UI shows.
- Trip dispatch/complete calls send an `Idempotency-Key` header per click so a double-click
  or flaky retry can't double-process a trip (backend also enforces this at the domain level).
- Every list auto-refreshes on the matching Socket.IO event (`vehicle.updated`, etc.) instead
  of polling.
