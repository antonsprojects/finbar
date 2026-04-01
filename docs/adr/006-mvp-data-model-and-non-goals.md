# ADR 006: MVP data model assumptions and non-goals

## Status

Accepted

## Context

Scope must stay small enough to ship a useful planner for one user while avoiding construction-ERP creep. Block 06 defines entities; this ADR captures the **assumptions** agents should rely on and what is **explicitly out of scope** for architecture discussions.

## MVP entities (assumptions)

All business rows are owned by a single **User** account (Finbar today; multi-tenant shape may exist later but **MVP behavior is single-user account**).

| Entity | Role |
| --- | --- |
| **User** | Account: email, auth material, profile fields as needed. |
| **Job** | Renovation job/site: name, address, status, notes. |
| **Worker** | Freelancer or crew member: contact, trade, notes. |
| **Task** | Work item, usually tied to a job; status; optional `assignedWorkerId`; optional `scheduledDate`. |
| **ScheduleAssignment** | **Who works which job on which calendar day**—separate from task assignment. |
| **WorkerAvailability** | Per worker per date: **`AVAILABLE` \| `UNAVAILABLE`** only (not “booked”). |
| **UserPreference** | e.g. `largeTextMode`, preferred default view. |

**Rule:** Keep **schedule assignment** (worker ↔ job ↔ day) **separate** from **task** assignment. Do not merge these concepts in the schema without a new ADR.

## Product non-goals (MVP)

The application **does not** aim to provide in v1:

- Invoicing or quotes
- Document management or file vault
- In-app chat or WhatsApp replacement
- CRM or sales pipeline
- Advanced reporting or BI
- Offline-first / sync engine
- Full construction ERP or materials planning

## Consequences

- Features outside this list require an explicit scope change and usually a new ADR or product doc update.
- APIs and UI should not grow “side doors” for invoice or chat data in MVP unless the product brief changes.
