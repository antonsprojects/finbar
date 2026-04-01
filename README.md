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

1. Clone the repository.
2. **Backend:** see [`backend/README.md`](backend/README.md) — `cp .env.example .env`, `npm install`, `npm run prisma:generate`, `npm run dev`; then open `GET http://localhost:3000/health`.
3. **Frontend:** see [`frontend/README.md`](frontend/README.md) — `cp .env.example .env`, `npm install`, `npm run dev` (default [http://localhost:5173](http://localhost:5173)).

## Branch strategy

- **`main`** — stable, deployable history (protect in GitHub/GitLab if you use PRs).
- **`develop`** (optional) — integration branch if you want a release train; otherwise **trunk-based on `main`** is fine for a small team.

Feature work: short-lived branches from `main` (or `develop`), merge via PR or direct merge as you prefer.

## License

See [LICENSE](LICENSE).
