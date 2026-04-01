# Local development

Predictable ports and a single Postgres container for the Finbar stack.

## Where to run commands

| What you want              | Working directory        |
| -------------------------- | ------------------------ |
| `npm run db:up` / `db:*`   | **Repository root** (next to `docker-compose.yml`) |
| `npm run dev` (API)        | **`backend/`** — or from root: `npm run dev:api` |
| `npm run dev` (Vite UI)    | **`frontend/`** — or from root: `npm run dev:web` |

There is **no** `npm run dev` at the repository root unless you add your own tooling.

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

   From the repository root (the folder that contains `docker-compose.yml` and `package.json`):

   ```bash
   cd /path/to/Finbar
   npm run db:up
   ```

   Do not append shell comments to `package.json` script lines. The script must be exactly `docker compose up -d postgres` inside `"db:up"`.

   Wait until the container is healthy (`docker compose ps` shows `healthy`).

2. **Backend env**

   From repo root:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Put **`#` comments on their own line** in the shell. If you run `cp .env.example .env first time only` (without `#`), the shell passes extra words to `cp` and you get errors like `cp: only: Not a directory`.

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

In three terminals (or use a terminal multiplexer). All `db:*` commands run from **repo root**.

1. Database (if not already running), from repo root: `npm run db:up`
2. API: either `cd backend && npm run dev` **or** from repo root: `npm run dev:api`
3. UI: either `cd frontend && npm run dev` **or** from repo root: `npm run dev:web`

Then open:

- App: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3000/health](http://localhost:3000/health)

## Root npm scripts

| Script               | Action                                      |
| -------------------- | ------------------------------------------- |
| `npm run db:up`      | Start Postgres in the background            |
| `npm run db:down`    | Stop Postgres (keeps the named volume)      |
| `npm run db:logs`    | Follow Postgres logs                        |
| `npm run db:reset`   | **Destructive:** remove volume and recreate |
| `npm run dev:api`    | Run backend dev server (same as `cd backend && npm run dev`) |
| `npm run dev:web`    | Run frontend dev server (same as `cd frontend && npm run dev`) |

## Frontend → API

- **Browser calls:** set `VITE_API_BASE_URL` in `frontend/.env` (default `http://127.0.0.1:3000`).
- **Vite proxy:** `frontend/vite.config.ts` proxies `/api` to the backend for same-origin requests during dev.

## Running the backend in Docker (optional, later)

If the API runs inside Compose, use hostname `postgres` in `DATABASE_URL` instead of `localhost`. The current examples assume the API runs on the host.

## Troubleshooting

- **`Missing script: "db:up"`** while in `backend/` or `frontend/`: run `npm run db:up` from the **repository root** only (that is where the script is defined).
- **`Missing script: "dev"`** at repo root: use `npm run dev:api`, `npm run dev:web`, or `cd backend` / `cd frontend` then `npm run dev`.
- **`cp: only: Not a directory`:** you pasted text after `.env` on the same line without a leading `#`, so the shell ran something like `cp .env.example .env first time only`. Use only: `cp .env.example .env` (and put notes on the **next** line, or use a line that starts with `#`).
- **`no such service: #` from `npm run db:up`:** root `package.json` has a stray `# …` inside the `"db:up"` value (often from copy-paste). It must be exactly: `"docker compose up -d postgres"` with no `#`.
- **Port 5432 in use:** stop the other Postgres, or map a different host port, e.g. in `docker-compose.yml` use `"5433:5432"` and set `DATABASE_URL=postgresql://finbar:finbar@localhost:5433/finbar`.
- **Prisma cannot connect:** ensure `npm run db:up` finished and `pg_isready` is happy; check `backend/.env` matches Compose credentials.
