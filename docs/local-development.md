# Local development

Predictable ports for the Finbar stack. **Postgres can be either** a dedicated role/database on **your existing server** (recommended if you already run Postgres) **or** the Docker Compose service below.

## Where to run commands

| What you want              | Working directory        |
| -------------------------- | ------------------------ |
| `npm run db:up` / `db:*`   | **Repository root** — only if you use **Docker** for Postgres |
| `npm run dev` (API)        | **`backend/`** — or from root: `npm run dev:api` |
| `npm run dev` (Vite UI)    | **`frontend/`** — or from root: `npm run dev:web` |

There is **no** `npm run dev` at the repository root unless you add your own tooling.

## Ports

| Service     | Port | Notes |
| ----------- | ---- | ----- |
| Frontend    | 5173 | Vite dev server (`frontend/`) |
| Backend API | 3000 | Fastify (`backend/`) |
| PostgreSQL  | your server’s port (often **5432**) | Same host as your other project if you use one Postgres instance |

---

## Postgres option A — Dedicated role and database (existing server)

Use this when **Postgres is already running** for another project on your machine. Create a **separate login and database** for Finbar so nothing is shared except the server process.

1. Connect as a superuser (name varies), for example:

   ```bash
   psql -U postgres -h localhost -d postgres
   ```

   Or with Homebrew: `psql postgres` sometimes works.

2. Run (pick your own password; keep it out of git):

   ```sql
   CREATE USER finbar WITH PASSWORD 'your_finbar_password';
   CREATE DATABASE finbar OWNER finbar;
   ```

3. Optional: if you use PG 15+ and hit permission errors on `public` later, as superuser:

   ```sql
   \c finbar
   GRANT ALL ON SCHEMA public TO finbar;
   ```

4. In **`backend/.env`**, set:

   ```env
   DATABASE_URL=postgresql://finbar:your_finbar_password@localhost:5432/finbar
   ```

   Use your real host/port if Postgres is not on `localhost:5432`.

5. You **do not** need `npm run db:up` or Docker for the database. Keep your existing Postgres service running (e.g. `brew services`).

---

## Postgres option B — Docker Compose

Use this when you want an isolated Postgres **only for Finbar** (no local server).

From the repository root:

```bash
cd /path/to/Finbar
cp .env.example .env
npm run db:up
```

If **`address already in use` on port 5432**, another Postgres is bound there. In repo-root `.env` set `FINBAR_PG_PUBLISH_PORT=5433`, set the same port in `backend/.env` inside `DATABASE_URL`, then `docker compose down` and `npm run db:up` again. See **Troubleshooting**.

Wait until the container is healthy (`docker compose ps` shows `healthy`).

Default Compose credentials: user `finbar`, password `finbar`, database `finbar`.

---

## Prerequisites

- **Node.js** 20+ (20.19+ recommended for latest Vite; 20.17 works with pinned Vite 6 in `frontend/`)
- **PostgreSQL** reachable from your machine — either **option A** or **option B** above
- **Docker** with Compose v2 — **only** if you use **option B**
- **npm** (ships with Node)

## First-time setup (application)

1. **Backend env**

   From repo root:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and set **`DATABASE_URL`** to match **option A** (your new role/database) or **option B** (Docker URL and port).

   Put **`#` comments on their own line** in the shell. If you run `cp .env.example .env first time only` (without `#`), the shell passes extra words to `cp` and you get errors like `cp: only: Not a directory`.

2. **Backend install & Prisma client**

   ```bash
   cd backend
   npm install
   npm run prisma:generate
   ```

   After Block 06 lands, run migrations here (e.g. `npx prisma migrate dev`).

3. **Frontend env**

   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   ```

## Daily startup

1. **Postgres:** ensure it is running — your OS service (option A) or `npm run db:up` (option B).
2. **API:** `cd backend && npm run dev` **or** from repo root: `npm run dev:api`
3. **UI:** `cd frontend && npm run dev` **or** from repo root: `npm run dev:web`

Then open:

- App: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3000/health](http://localhost:3000/health)

## Root npm scripts

| Script               | Action                                      |
| -------------------- | ------------------------------------------- |
| `npm run db:up`      | Start Docker Postgres (option B only)       |
| `npm run db:down`    | Stop Docker Postgres                          |
| `npm run db:logs`    | Follow Docker Postgres logs                 |
| `npm run db:reset`   | **Destructive:** remove volume and recreate |
| `npm run dev:api`    | Run backend dev server                      |
| `npm run dev:web`    | Run frontend dev server                     |

## Frontend → API

- **Browser calls:** set `VITE_API_BASE_URL` in `frontend/.env` (default `http://127.0.0.1:3000`).
- **Vite proxy:** `frontend/vite.config.ts` proxies `/api` to the backend for same-origin requests during dev.

## Running the backend in Docker (optional, later)

If the API runs inside Compose, use hostname `postgres` in `DATABASE_URL` instead of `localhost`. The current examples assume the API runs on the host.

## Troubleshooting

- **`Missing script: "db:up"`** while in `backend/` or `frontend/`: run `npm run db:up` from the **repository root** only (that is where the script is defined). If you use **option A**, you do not need this script.
- **`Missing script: "dev"`** at repo root: use `npm run dev:api`, `npm run dev:web`, or `cd backend` / `cd frontend` then `npm run dev`.
- **`cp: only: Not a directory`:** you pasted text after `.env` on the same line without a leading `#`, so the shell ran something like `cp .env.example .env first time only`. Use only: `cp .env.example .env` (and put notes on the **next** line, or use a line that starts with `#`).
- **`no such service: #` from `npm run db:up`:** root `package.json` has a stray `# …` inside the `"db:up"` value (often from copy-paste). It must be exactly: `"docker compose up -d postgres"` with no `#`.
- **Port 5432 in use when starting Docker (option B):** use `FINBAR_PG_PUBLISH_PORT` in repo-root `.env` and match `DATABASE_URL` in `backend/.env`, or stop the conflicting service. See **Postgres option B** above. To see what holds 5432: `lsof -nP -iTCP:5432 | grep LISTEN`.
- **Prisma cannot connect:** check `DATABASE_URL` in `backend/.env` (user, password, host, port, database name). For option A, confirm `psql "$DATABASE_URL"` works.
