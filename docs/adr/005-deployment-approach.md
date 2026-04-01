# ADR 005: Deployment approach

## Status

Accepted

## Context

MVP must be reachable online with HTTPS, repeatable deploys, and a managed database. Specific vendors can change; the **shape** of deployment should stay stable so Blocks 21+ do not reopen architecture.

## Decision

- **Frontend:** **Static SPA build** (Vite output) served from a **CDN-capable host** (e.g. Vercel, Netlify, Cloudflare Pages, or S3+CloudFront). Exact vendor is an implementation detail in Block 21.
- **Backend:** **Node process** running the Fastify app on a **container-friendly PaaS** or Node PaaS (e.g. Fly.io, Render, Railway, or similar). One service per environment minimum: `staging`, `production`.
- **Database:** **Managed PostgreSQL** (e.g. Neon, Supabase Postgres, AWS RDS, Fly Postgres). Connection string via secrets; **no** production DB on the app server disk.
- **Migrations:** Run **Prisma migrate** (or equivalent) as part of deploy or a dedicated release step—not only manually.
- **TLS:** Terminate HTTPS at the edge (host default); enforce HTTPS redirects in production.

## Consequences

- Environment variables differ per environment; never commit secrets.
- Local dev may use Docker Compose for Postgres; production uses managed Postgres.
- Changing host names is a config change, not an ADR change, as long as this topology holds.
