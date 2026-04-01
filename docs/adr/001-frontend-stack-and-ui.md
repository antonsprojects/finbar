# ADR 001: Frontend stack and UI approach

## Status

Accepted

## Context

Finbar is a SaaS web app for a single primary user who needs a reliable, glanceable planner on site (phone) and elsewhere (larger screens). The dev plan standardizes on the Vue ecosystem for the client.

## Decision

- **Framework:** Vue 3 (Composition API).
- **Language:** TypeScript everywhere in the frontend.
- **Build tool:** Vite.
- **State:** Pinia.
- **Routing:** Vue Router.
- **Styling:** Tailwind CSS.
- **UI components:** A **small custom layer** built on accessible primitives (e.g. Radix-Vue or hand-rolled patterns). **Avoid** heavy coupling to shadcn-style copy-paste ecosystems as the default; keep dependencies minimal and the surface area easy to change.

## Consequences

- Agents and contributors align on one SPA stack; no React/Svelte experiments in MVP.
- Custom components cost more upfront than a full kit but reduce lock-in and keep the UI tailored to high-legibility / worksite use.
- Tailwind supports rapid layout and a dedicated large-text mode without parallel design systems.
