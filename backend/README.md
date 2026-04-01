# Finbar backend

Node.js + TypeScript + Fastify API. See [docs/adr](../docs/adr/) for stack decisions.

## Setup

```bash
cp .env.example .env
# Adjust DATABASE_URL if needed (Postgres required in .env for Prisma CLI).
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
