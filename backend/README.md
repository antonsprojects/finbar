# Finbar backend

Node.js + TypeScript + Fastify API. See [docs/adr](../docs/adr/) for stack decisions.

`npm run db:up` does **not** exist in this folder — it is defined only in the **parent** `package.json`, and only if you use **Docker** for Postgres.

## Setup

Prefer a **dedicated Postgres user + database** on your existing server, and set `DATABASE_URL` in `.env`. Alternatively start Postgres via Docker from repo root: `npm run db:up`. See [docs/local-development.md](../docs/local-development.md).

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

## Scripts

| Script                    | Purpose               |
| ------------------------- | --------------------- |
| `npm run dev`             | Watch mode with `tsx` |
| `npm run build`           | Compile to `dist/`    |
| `npm start`               | Run compiled app      |
| `npm run lint`            | ESLint on `src/`      |
| `npm run format`          | Prettier write        |
| `npm run prisma:generate` | Prisma Client         |

## Health

`GET /health` → JSON `{ status, timestamp }`.
