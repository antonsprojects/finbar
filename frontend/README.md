# Finbar frontend

Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind CSS v4. See [`docs/adr`](../docs/adr/) and [local development](../docs/local-development.md).

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Routes: `/login`, `/today`, `/week`, `/jobs`, `/jobs/:id`, `/workers`, `/settings`.

## Environment

| Variable            | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Backend origin (no trailing slash), e.g. `http://127.0.0.1:3000` |

If unset in development, the app falls back to `http://127.0.0.1:3000` and logs a warning.

## Dev proxy

`vite.config.ts` proxies `/api/*` to `http://127.0.0.1:3000` with the `/api` prefix stripped, so you can call `fetch('/api/health')` during local development without CORS.

## Scripts

| Script            | Purpose                      |
| ----------------- | ---------------------------- |
| `npm run dev`     | Vite dev server              |
| `npm run build`   | Typecheck + production build |
| `npm run preview` | Preview production build     |
| `npm run lint`    | ESLint                       |
| `npm run format`  | Prettier                     |

## Node

Pinned to **Vite 6** for compatibility with Node 20 LTS below 20.19. Upgrade Node to **20.19+** (or 22.12+) when you want to move to Vite 8.
