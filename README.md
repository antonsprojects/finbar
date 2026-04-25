# Finbar — SaaS planner

Cloud-based planning for a single-user renovation contractor: **jobs**, **workers**, **tasks**, and **weekly scheduling**, with **high-legibility mode** for on-site use.

## MVP scope

- Today and week views: who is working, what is open, who is available when
- CRUD for jobs, workers, tasks; worker availability; assignments by day
- SaaS persistence (survives lost/broken phones), simple auth
- User preferences including large-text / easy-reading mode

## Non-goals (v1)

Invoicing, document management, chat, CRM, advanced reporting, offline-first complexity.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | Web client (Vue 3 stack — see ADRs in `docs/adr/` once Block 02 is done) |
| `backend/` | API and persistence |
| `docs/` | ADRs, product/technical docs |
| `Documentation/` | UX research, user profile, dev plan (source material) |

## Getting started

Full sequence (Postgres, ports, env files): **[docs/local-development.md](docs/local-development.md)**.

Short version (see [docs/local-development.md](docs/local-development.md) for paths):

1. **Database:** either create a **dedicated Postgres user + database** on your existing server, and put that in `backend/.env` → `DATABASE_URL`, **or** use Docker from repo root: `npm run db:up` (optional).
2. **Backend:** in `backend/`: copy `.env.example` → `.env`, then `npm install`, `npm run prisma:generate`, `npm run dev`. Or from root: `npm run dev:api`.
3. **Frontend:** in `frontend/`: copy `.env.example` → `.env`, then `npm install`, `npm run dev`. Or from root: `npm run dev:web`.

Do not put `npm run dev` at repo root (no script there). When copying `cp` commands, do not add words after `.env` on the same line unless the line starts with `#`.

## Productie (VPS, Docker, GitHub Actions)

Een stappenplan voor o.a. een subdomein op je eigen server met **Docker**, **ghcr.io**, en **push→deploy** staat in **[docs/deploy-vps.md](docs/deploy-vps.md)**. Bestanden: `Dockerfile`, `deploy/compose.production.yaml`, `deploy/nginx/finbar.conf.example`, `deploy/Caddyfile.example`, `.github/workflows/deploy.yml`.

## Branch strategy

- **`main`** — stable, deployable history (protect in GitHub/GitLab if you use PRs).
- **`develop`** (optional) — integration branch if you want a release train; otherwise **trunk-based on `main`** is fine for a small team.

Feature work: short-lived branches from `main` (or `develop`), merge via PR or direct merge as you prefer.

## License

See [LICENSE](LICENSE).
