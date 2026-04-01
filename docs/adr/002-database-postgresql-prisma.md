# ADR 002: PostgreSQL and Prisma

## Status

Accepted

## Context

The product must persist user data in the cloud (devices are lost or replaced often). Relational data (jobs, workers, tasks, schedule rows) fits a SQL database. The dev plan targets PostgreSQL and Prisma for schema and migrations.

## Decision

- **Database engine:** **PostgreSQL** (managed in production; local Docker or native install in development).
- **Application access:** **Prisma** as the ORM and migration tool.
- **Migrations:** Checked into the repo; applied in CI/CD and local workflows per Block 06.

## Consequences

- Schema is versioned and reviewable as `schema.prisma` plus migration SQL.
- Team uses Prisma Client in the backend; no raw-SQL-first policy required for MVP.
- Switching ORMs later is possible but non-trivial; Prisma is the locked choice for v1.
