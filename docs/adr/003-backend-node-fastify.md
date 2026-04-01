# ADR 003: Backend runtime, framework, and API style

## Status

Accepted

## Context

The frontend is TypeScript/Vite; a Node.js backend shares tooling and hiring mental models. The dev plan allows Fastify or Express and recommends not overthinking the choice.

## Decision

- **Runtime:** **Node.js** (LTS).
- **Language:** **TypeScript**.
- **HTTP framework:** **Fastify** (performance, schema-friendly hooks, good TypeScript story).
- **API style:** **REST** over HTTPS for MVP (JSON request/response). No GraphQL in v1.
- **Integration with data:** Prisma Client inside route handlers or a thin service layer (exact layering left to Block 08).

## Consequences

- Slightly fewer copy-paste examples than Express; official Fastify docs and plugins remain the reference.
- REST keeps client and tooling simple; versioning can be path-based (`/api/v1/...`) if needed later.
- If Fastify becomes a bottleneck for team familiarity only, revisit with a new ADR—do not silently introduce a second framework.
