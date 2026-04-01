# ADR 004: Authentication for MVP

## Status

Accepted

## Context

Finbar is multi-device SaaS; the first user must log in and stay signed in across refreshes without putting long-lived tokens in `localStorage` if we can avoid it. Block 07 recommends email + password and notes that cookie-based auth is often cleaner than localStorage JWT for MVP.

## Decision

- **Credentials:** **Email + password** registration and login. **No** social/OAuth providers in MVP unless a later ADR adds them.
- **Password storage:** Strong one-way hashing (e.g. bcrypt or argon2—implementation detail in Block 07).
- **Session model:** **HTTP-only, Secure (in prod), SameSite-aware cookies** backing a **server-side session** or an opaque session id stored server-side. Avoid exposing bearer tokens to frontend JavaScript for the default flow.
- **Authorization:** Every data access is scoped by **authenticated user id**; no cross-tenant reads or writes.

## Consequences

- Frontend uses `credentials: 'include'` (or equivalent) for API calls; CORS must allow the app origin and cookies.
- Horizontal scaling later may require a shared session store (e.g. Redis); single-node MVP can use in-memory or DB-backed sessions—document the choice when implementing Block 07.
- JWT in localStorage is **not** the default pattern for this codebase.
