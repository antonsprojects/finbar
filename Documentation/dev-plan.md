# Dev Plan — Finbar SaaS Planner
## Agent-Executable Blocks

## Ground Rules
- Build for **MVP only**
- Prefer **boring, reliable choices**
- Keep scope centered on:
  - jobs
  - workers
  - tasks
  - schedule
  - user preferences
- Build for:
  - mobile-first practical use
  - cloud persistence
  - simple auth
  - high-legibility mode
- Avoid:
  - invoicing
  - document management
  - chat
  - CRM
  - advanced reporting
  - offline-first complexity in v1

---

# Block 01 — Project Initialization

## Goal
Create the initial project structure so development can start in a stable way.

## Tasks
- Create Git repository
- Define monorepo or separate frontend/backend repos
- Add README with project purpose and MVP scope
- Add `.gitignore`
- Add license if needed
- Define branch strategy:
  - `main`
  - `develop` or trunk-only
- Add issue / task template if useful
- Add base folder structure

## Recommended structure
- `/frontend`
- `/backend`
- `/docs`

## Deliverables
- Working repo
- Clean folder structure
- Initial README with setup instructions

## Done when
- Repo exists
- Fresh clone works
- Team/agent can understand where code belongs

## Depends on
- Nothing

---

# Block 02 — Architecture Decision Record (ADR) Setup

## Goal
Lock the core technical choices before implementation drifts.

## Tasks
- Create `/docs/adr`
- Write ADRs for:
  - frontend stack
  - backend stack
  - database choice
  - auth approach
  - deployment approach
- Record MVP data model assumptions
- Record non-goals

## Required decisions
- Frontend: Vue 3 + TypeScript + Vite + Pinia + Vue Router + Tailwind
- UI approach: custom component layer, minimal dependency on shadcn-style patterns
- Database: PostgreSQL
- Backend: choose one and lock it
- Auth: choose one and lock it
- API style: REST is fine for MVP

## Deliverables
- 4–6 ADR markdown files

## Done when
- Major technical choices are written down
- Agents no longer guess architecture

## Depends on
- Block 01

---

# Block 03 — Backend Stack Selection and Bootstrap

## Goal
Create the backend foundation.

## Recommended choice
Use a **Node.js TypeScript backend** that fits the frontend team’s stack well.

A sensible MVP choice:
- **Node.js**
- **TypeScript**
- **Fastify** or **Express**
- **Prisma ORM**
- **PostgreSQL**

Fastify is slightly cleaner and faster.
Express is more common and easier to find examples for.
Either is acceptable. Do not overthink this.

## Tasks
- Initialize backend project
- Set up TypeScript
- Set up linting and formatting
- Add environment variable handling
- Add healthcheck endpoint
- Add basic error handling
- Add logging
- Add package scripts

## Deliverables
- Running backend server
- `/health` endpoint
- Env config structure

## Done when
- Backend starts locally
- Health endpoint responds
- Basic DX is clean

## Depends on
- Block 02

---

# Block 04 — Frontend Bootstrap

## Goal
Create the frontend application base.

## Tasks
- Initialize Vue 3 + TypeScript + Vite app
- Install Vue Router
- Install Pinia
- Install Tailwind CSS
- Add base app shell
- Set up route placeholders:
  - `/login`
  - `/today`
  - `/week`
  - `/jobs`
  - `/jobs/:id`
  - `/workers`
  - `/settings`
- Add linting and formatting
- Add env handling
- Add API base URL config

## Deliverables
- Running frontend app
- Placeholder pages
- Router and store working

## Done when
- Frontend starts locally
- Routes render
- Base app shell exists

## Depends on
- Block 01
- Can be done in parallel with Block 03, but complete before integration work

---

# Block 05 — Dev Environment and Local Orchestration

## Goal
Make local development predictable.

## Tasks
- Add Docker setup for PostgreSQL
- Add backend `.env.example`
- Add frontend `.env.example`
- Add root-level scripts or Makefile for local startup
- Define local ports
- Document startup sequence

## Example local services
- frontend: `5173`
- backend: `3000`
- postgres: `5432`

## Deliverables
- Local dev environment docs
- PostgreSQL container
- Easy startup flow

## Done when
- A new dev can boot the stack locally without guessing

## Depends on
- Blocks 03 and 04

---

# Block 06 — Database Schema v1

## Goal
Define the first usable relational model.

## MVP entities
- User
- Job
- Worker
- Task
- ScheduleAssignment
- WorkerAvailability
- UserPreference

## Suggested modeling
### User
- id
- email
- password hash or auth provider id
- name
- createdAt
- updatedAt

### Job
- id
- userId
- name
- address
- status
- notes
- createdAt
- updatedAt

### Worker
- id
- userId
- name
- phone
- trade
- notes
- createdAt
- updatedAt

### Task
- id
- userId
- jobId
- title
- description
- status
- scheduledDate
- assignedWorkerId nullable
- createdAt
- updatedAt
- completedAt nullable

### ScheduleAssignment
- id
- userId
- workerId
- jobId
- date
- notes
- createdAt
- updatedAt

### WorkerAvailability
- id
- userId
- workerId
- date
- status (`available`, `unavailable`, `booked` is possible, but think carefully)
- notes

### UserPreference
- id
- userId
- largeTextMode boolean
- preferredView
- createdAt
- updatedAt

## Important rule
Keep **schedule assignment** separate from **task assignment**.

## Tasks
- Create Prisma schema
- Add migrations
- Seed minimal test data

## Deliverables
- Initial schema
- First migration
- Seed script

## Done when
- Database can be created from scratch
- Seed data supports frontend development

## Depends on
- Block 03
- Block 05

---

# Block 07 — Authentication

## Goal
Enable secure account-based SaaS access.

## MVP recommendation
Use **email + password** first.
Do not start with social login unless there is a strong reason.

## Tasks
- Create registration endpoint
- Create login endpoint
- Create logout endpoint
- Add password hashing
- Add session or JWT-based auth
- Add auth middleware
- Add “current user” endpoint
- Protect private routes on backend
- Guard private routes on frontend

## Decision note
For MVP, cookie-based auth is often cleaner than localStorage token patterns.

## Deliverables
- Register/login flow
- Protected API access
- Persistent session

## Done when
- User can create account
- User can log in
- User stays authenticated across refresh
- Protected routes reject unauthenticated access

## Depends on
- Block 06

---

# Block 08 — API Foundations

## Goal
Create the base API conventions before feature endpoints multiply.

## Tasks
- Define API response conventions
- Define error response shape
- Add request validation
- Add pagination conventions where needed
- Add shared auth handling
- Add API version prefix if desired
- Add OpenAPI or lightweight endpoint docs

## Deliverables
- Stable API conventions
- Validation layer
- Shared error handling

## Done when
- New endpoints can be added consistently

## Depends on
- Blocks 03 and 07

---

# Block 09 — Core CRUD: Jobs

## Goal
Implement job management.

## Tasks
- Create job endpoints:
  - list jobs
  - create job
  - update job
  - get job detail
  - archive/complete job
- Connect frontend jobs pages
- Add jobs list page
- Add job create/edit form
- Add basic validation

## Deliverables
- Working Jobs feature

## Done when
- User can manage jobs end-to-end

## Depends on
- Blocks 07 and 08

---

# Block 10 — Core CRUD: Workers

## Goal
Implement worker management.

## Tasks
- Create worker endpoints:
  - list workers
  - create worker
  - update worker
  - get worker detail
- Create workers page
- Create worker create/edit form
- Support basic fields:
  - name
  - phone
  - trade
  - notes

## Deliverables
- Working Workers feature

## Done when
- User can add and maintain freelancer records

## Depends on
- Blocks 07 and 08

---

# Block 11 — Core CRUD: Tasks

## Goal
Implement task management.

## Tasks
- Create task endpoints:
  - list tasks
  - create task
  - update task
  - mark done
  - filter by date/job/status
- Add task form
- Add task list on job detail page
- Add support for:
  - scheduled date
  - status
  - assigned worker optional

## Deliverables
- Working Tasks feature

## Done when
- User can create and track tasks per job

## Depends on
- Blocks 09 and 10

---

# Block 12 — Scheduling: Worker Availability

## Goal
Track who is available on which day.

## Tasks
- Create availability endpoints:
  - list by worker/date range
  - upsert availability by day
- Build worker availability UI
- Support week-level view
- Make editing simple and quick

## Deliverables
- Availability data layer
- Availability editing UI

## Done when
- User can see and update worker availability per day

## Depends on
- Block 10

---

# Block 13 — Scheduling: Job Assignments by Day

## Goal
Track which worker is assigned to which job on which day.

## Tasks
- Create schedule assignment endpoints
- Build week planner page
- Show:
  - workers
  - days
  - assigned jobs
  - gaps / unassigned states
- Allow create/update/delete assignment
- Prevent obviously invalid duplicate conflicts if needed

## Deliverables
- Week planner UI
- Assignment data flow

## Done when
- User can plan worker-to-job assignments for the week

## Depends on
- Blocks 09, 10, 12

---

# Block 14 — Today View

## Goal
Build the most important MVP screen.

## Screen requirements
The Today view should answer:
- who is working today
- what jobs are active today
- which tasks are due today
- what is overdue
- what is unassigned

## Tasks
- Create backend query endpoint(s) for aggregated today data
- Build Today page UI
- Add overdue/unassigned sections
- Add quick actions:
  - mark task done
  - assign worker
  - open job
  - open worker

## Deliverables
- Functional Today screen

## Done when
- A user can open one screen and understand today’s operational state

## Depends on
- Blocks 11, 12, 13

---

# Block 15 — User Preferences and Large-Text Mode

## Goal
Implement the readability mode early enough that it actually shapes the UI.

## Tasks
- Add preferences endpoint
- Persist `largeTextMode`
- Add visible toggle in UI
- Define Tailwind-based size tokens for:
  - text
  - buttons
  - inputs
  - cards
  - spacing
- Apply mode consistently across all MVP screens

## Important rule
Do not just increase font size. Also increase:
- spacing
- target sizes
- layout breathing room

## Deliverables
- Working high-legibility mode

## Done when
- User can toggle large-text mode
- Preference persists across sessions/devices
- Main screens remain usable in both modes

## Depends on
- Blocks 04, 07, 14

---

# Block 16 — Design System v1

## Goal
Prevent the UI from turning into inconsistent Tailwind chaos.

## Tasks
- Define core design tokens:
  - spacing
  - typography
  - radius
  - border styles
  - color roles
- Build minimal reusable components:
  - Button
  - Input
  - Textarea
  - Select
  - Toggle
  - Card
  - Badge
  - Drawer / Sheet
  - Dialog
  - PageHeader
- Define mobile-first layout rules
- Define large-text variants

## Deliverables
- Small internal component library
- UI consistency rules

## Done when
- New screens can be built from a stable component set

## Depends on
- Block 04
- Should be started before too many screens are built, but after some real UI learning

---

# Block 17 — Autosave and Form Reliability

## Goal
Reduce data loss and frustration.

## Tasks
- Decide where autosave is appropriate
- Add debounced autosave for suitable forms
- Add unsaved-state protection where autosave is not used
- Add visible save feedback
- Add recoverable error messages

## Deliverables
- Reliable save behavior
- Reduced fear of losing edits

## Done when
- User actions feel safe
- Partial updates do not disappear silently

## Depends on
- Blocks 09–15

---

# Block 18 — Seeded Demo Data and Empty States

## Goal
Make the product testable and understandable from first run.

## Tasks
- Improve seed data realism
- Add useful empty states for:
  - no jobs
  - no workers
  - no tasks
  - no assignments
- Add onboarding hints where needed

## Deliverables
- Better developer demo experience
- Better early user testing flow

## Done when
- New account state is understandable
- Demo environment shows product value quickly

## Depends on
- Blocks 09–15

---

# Block 19 — QA Foundations

## Goal
Introduce minimal but real quality control.

## Tasks
- Add backend unit tests for core business logic
- Add frontend component tests for critical UI
- Add end-to-end tests for:
  - register/login
  - create job
  - create worker
  - create task
  - assign worker to day
  - view today screen
  - toggle large-text mode
- Add test database setup
- Add CI pipeline

## Deliverables
- Test suite
- CI checks

## Done when
- Critical MVP paths are protected against regression

## Depends on
- Blocks 07–18

---

# Block 20 — Security and Hardening Pass

## Goal
Fix obvious SaaS risks before release.

## Tasks
- Validate all input
- Ensure auth boundaries are enforced by user ownership
- Prevent cross-user data access
- Add rate limiting on auth endpoints
- Add secure password policy
- Add CORS config
- Ensure cookies/session config is secure
- Review logging for sensitive data leaks

## Deliverables
- Basic security hardening

## Done when
- Common avoidable security mistakes are addressed

## Depends on
- Blocks 07–19

---

# Block 21 — Deployment Setup

## Goal
Deploy a usable MVP environment.

## Tasks
- Choose hosting for frontend
- Choose hosting for backend
- Choose managed PostgreSQL
- Set environment variables
- Set up migrations in deployment pipeline
- Set up domain/subdomain structure
- Add HTTPS
- Add monitoring basics
- Add error reporting

## Deliverables
- Staging environment
- Production deployment path

## Done when
- App is accessible online
- Deployments are repeatable

## Depends on
- Blocks 03–20

---

# Block 22 — Analytics and Operational Logging

## Goal
Capture enough usage data to learn from the MVP.

## Tasks
- Add basic product analytics:
  - login
  - job created
  - worker created
  - task created
  - schedule assignment created
  - large-text mode toggled
- Add operational logs
- Add error tracking

## Deliverables
- Basic analytics events
- Error visibility

## Done when
- You can see what users actually do
- You can detect breakage

## Depends on
- Blocks 14–21

---

# Block 23 — MVP Cleanup Pass

## Goal
Reduce complexity before user testing.

## Tasks
- Remove dead components
- Remove unused routes
- Simplify forms
- Reduce hidden actions
- Check mobile ergonomics
- Check button sizes
- Check large-text mode again
- Check performance on average phones

## Deliverables
- Cleaner MVP
- Reduced UX friction

## Done when
- Product feels smaller, clearer, and more direct than before cleanup

## Depends on
- Blocks 09–22

---

# Block 24 — Release Candidate

## Goal
Prepare the first real testable version.

## Tasks
- Freeze scope
- Run migrations on staging
- Populate staging with realistic data
- Execute critical user journeys manually
- Fix blocker bugs only
- Produce release notes
- Produce admin/dev handoff notes

## Deliverables
- MVP release candidate

## Done when
- The app can be tested by a real user without major operational gaps

## Depends on
- Blocks 01–23

---

# Suggested Execution Order
1. Block 01 — Project Initialization
2. Block 02 — ADR Setup
3. Block 03 — Backend Bootstrap
4. Block 04 — Frontend Bootstrap
5. Block 05 — Dev Environment
6. Block 06 — Database Schema v1
7. Block 07 — Authentication
8. Block 08 — API Foundations
9. Block 09 — Jobs
10. Block 10 — Workers
11. Block 11 — Tasks
12. Block 12 — Worker Availability
13. Block 13 — Job Assignments by Day
14. Block 14 — Today View
15. Block 15 — Large-Text Mode
16. Block 16 — Design System v1
17. Block 17 — Autosave and Reliability
18. Block 18 — Seed Data and Empty States
19. Block 19 — QA Foundations
20. Block 20 — Security Hardening
21. Block 21 — Deployment Setup
22. Block 22 — Analytics
23. Block 23 — MVP Cleanup
24. Block 24 — Release Candidate

---

# Notes for Agents
- Each block should be completed in its own PR or change set where possible
- Do not start advanced features before the previous block is stable
- If a block reveals a schema issue, update the ADR and schema before continuing
- Prefer deleting complexity over adding flexibility
- Keep the app optimized for one real user profile, not hypothetical future enterprises