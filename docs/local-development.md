# Local development

Predictable ports and a single Postgres container for the Finbar stack.

## Ports

| Service    | Port | Notes                                      |
| ---------- | ---- | ------------------------------------------ |
| Frontend   | 5173 | Vite dev server (`frontend/`)              |
| Backend API | 3000 | Fastify (`backend/`)                      |
| PostgreSQL | 5432 | Docker Compose service `postgres`          |

## Prerequisites

- **Node.js** 20+ (20.19+ recommended for latest Vite; 20.17 works with pinned Vite 6 in `frontend/`)
- **Docker** with Compose v2 (`docker compose`)
- **npm** (ships with Node)

## First-time setup

1. **Start Postgres**

   From the repository root:

   ```bash
   npm run db:up
   ```

   Wait until the container is healthy (`docker compose ps` shows `healthy`).

2. **Backend env**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Default `DATABASE_URL` matches Compose (`finbar` / `finbar` / database `finbar` on `localhost:5432`).

3. **Backend install & Prisma client**

   ```bash
   cd backend
   npm install
   npm run prisma:generate
   ```

   After Block 06 lands, run migrations here (e.g. `npx prisma migrate dev`).

4. **Frontend env**

   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   ```

## Daily startup

In three terminals (or use a terminal multiplexer):

1. Database (if not already running): `npm run db:up` (repo root)
2. API: `cd backend && npm run dev`
3. UI: `cd frontend && npm run dev`

Then open:

- App: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3000/health](http://localhost:3000/health)

## Root npm scripts

| Script        | Action                                      |
| ------------- | ------------------------------------------- |
| `npm run db:up`   | Start Postgres in the background            |
| `npm run db:down` | Stop Postgres (keeps the named volume)      |
| `npm run db:logs` | Follow Postgres logs                        |
| `npm run db:reset` | **Destructive:** remove volume and recreate |

## Frontend → API

- **Browser calls:** set `VITE_API_BASE_URL` in `frontend/.env` (default `http://127.0.0.1:3000`).
- **Vite proxy:** `frontend/vite.config.ts` proxies `/api` to the backend for same-origin requests during dev.

## Running the backend in Docker (optional, later)

If the API runs inside Compose, use hostname `postgres` in `DATABASE_URL` instead of `localhost`. The current examples assume the API runs on the host.

## Troubleshooting

- **Port 5432 in use:** stop the other Postgres, or map a different host port, e.g. in `docker-compose.yml` use `"5433:5432"` and set `DATABASE_URL=postgresql://finbar:finbar@localhost:5433/finbar`.
- **Prisma cannot connect:** ensure `npm run db:up` finished and `pg_isready` is happy; check `backend/.env` matches Compose credentials.
