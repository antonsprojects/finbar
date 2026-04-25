# Finbar frontend

Vue 3 + TypeScript + Vite + Vue Router + Pinia + Tailwind CSS v4. See [`docs/adr`](../docs/adr/), [design system v1](../docs/design-system-v1.md), and [local development](../docs/local-development.md).

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Routes: `/login`, `/today` (operational dashboard), `/week` (availability + crew-on-jobs planner), `/jobs`, `/jobs/:id`, `/workers`, `/settings` (large-text mode and preferences).

## Environment

| Variable            | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Backend origin (no trailing slash), e.g. `http://127.0.0.1:3001` |

If unset in development, the app falls back to `http://127.0.0.1:3001` and logs a warning.

## Dev proxy

`vite.config.ts` forwards **`/api`** to the backend on port **3001** with the same path (e.g. `/api/auth/me` → backend `/api/auth/me`). Use **`fetch('/api/...', { credentials: 'include' })`** so httpOnly session cookies work. Direct calls to `http://127.0.0.1:3001` need CORS; the proxy avoids that for same-origin requests.

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
