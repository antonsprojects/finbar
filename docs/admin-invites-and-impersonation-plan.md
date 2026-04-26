# Admin, invites, and impersonation plan

## Goal

Finbar needs two separate account types:

- **User account:** one human login for one company. Today this is the contractor using Finbar for their own company.
- **Administrator account:** one global super-admin for v1. This account is separate from user accounts and can invite users, manage invites, and temporarily view/use a user's Finbar environment through the browser.

Registration must become invite-only. A person can only create a user account with a valid invite code.

## Product decisions

### Account model

- A user account represents one person and one company.
- For v1 there is one global super-admin account.
- Admin and user logins are separate; the same login should not be both.
- The first admin is created from the terminal, not through public registration.
- Finbar starts with one company/user (Sjaft), but the design should not block adding other contractors with their own companies later.
- Google/social login is out of scope for now.

### Invites

- Users cannot register without an invite code.
- Invites are single-use.
- Invites expire after 7 days.
- Invites can be revoked from the admin UI before they are used.
- The invite code is a short human-readable code made from letters and numbers.
- The email invite link opens the registration page and pre-fills the invite code.
- The registration page also supports manually typing the invite code.
- The invite does not need to be hard-bound to the recipient email for v1; possession of the valid code is enough.

### Email

- Invite emails are Dutch only.
- Finbar should use SMTP directly, not a separate email microservice.
- Production SMTP target should match the existing VPS pattern:
  - Host: `smtp.hostinger.com`
  - Port: `465`
  - SSL on connect: enabled
  - STARTTLS: disabled
  - Credentials and sender identity from environment variables
- Local development should be able to log emails to the console/server log instead of sending through SMTP.
- Email links should use `PUBLIC_APP_URL` as the public browser origin.

### Impersonation

- During testing, the admin can do everything the user can do while impersonating them.
- No impersonation audit log is required yet.
- Users are not notified when an admin impersonates them.
- The UI must show a clear banner while impersonating, including an exit action.
- Admin data and user data must stay separate; impersonation should switch the effective user context for normal app routes.

## Open decisions

These are still unclear and should be decided before implementation or handled with the default noted below.

- **Used invite revocation:** If an invite has already been used, should "revoke" disappear, or should it be shown as no-op? Recommended default: once used, an invite cannot be revoked because the account already exists.
- **Duplicate invite to same email:** If the admin invites the same email again while an unused invite exists, should Finbar resend the same code, create a new invite and revoke the old one, or block duplicates? Recommended default: block another active invite for the same email and offer "resend".
- **Admin password reset:** Should admins use the same password reset flow as users? Recommended default: yes, if admins are stored in the same accounts table.
- **Impersonation timeout:** Should impersonation end when the normal auth cookie expires, or sooner? Recommended default: same 7-day auth cookie for implementation simplicity, with the visible banner and explicit exit.

## Current codebase context

The current implementation has:

- A `User` Prisma model that owns jobs, workers, tasks, preferences, schedule assignments, and related project data.
- Email/password auth in `backend/src/routes/auth.ts`.
- HTTP-only cookie auth via Fastify JWT in `backend/src/app.ts`.
- Frontend auth state in `frontend/src/stores/auth.ts`.
- Public register and login pages in `frontend/src/views/RegisterView.vue` and `frontend/src/views/LoginView.vue`.
- Password reset email support in `backend/src/lib/send-password-reset-email.ts`, currently using Resend if configured and otherwise logging the reset link.

The plan below builds on this rather than replacing the auth system.

## Data model plan

### Add account roles

Add a role field to the existing user table:

- `AccountRole`
  - `USER`
  - `ADMIN`
- `User.role AccountRole @default(USER)`

Rationale: this keeps the current data ownership model intact. Admins can be represented by `User` rows without owning normal project data. App routes can continue using the effective user id for normal user data.

### Add invite records

Add an `Invite` model:

- `id`
- `codeHash`
- `email`
- `createdByAdminId`
- `createdAt`
- `expiresAt`
- `revokedAt`
- `usedAt`
- `usedByUserId`

Recommended constraints and indexes:

- Unique `codeHash`.
- Index `email`.
- Index `createdByAdminId`.
- Index `expiresAt`.
- Optional partial uniqueness is not directly supported by Prisma for "one active invite per email"; enforce that in application code.

Do not store the raw invite code. Store a SHA-256 hash of the normalized code, matching the password reset token pattern.

## Backend plan

### 1. Auth claims and helpers

Update JWT payloads so login sessions include:

- `sub`: real logged-in account id
- `role`: account role
- `impersonatingUserId`: optional effective user id when an admin is impersonating

Add backend helpers:

- `requireAuth`: verifies cookie.
- `requireAdmin`: verifies authenticated account has role `ADMIN`.
- `getEffectiveUserId(request)`: returns `impersonatingUserId` for admin impersonation, otherwise `sub`.
- `getRealAccountId(request)`: returns `sub`.

Replace normal route usage of `request.user.sub` with `getEffectiveUserId(request)` for user-owned app data.

Important rule: admin management routes must use the real account id and must never use the impersonated user id.

### 2. Invite-only registration

Change `POST /api/auth/register` so it requires `inviteCode`.

Registration flow:

1. Normalize the code by trimming whitespace and uppercasing.
2. Hash the normalized code.
3. Find an invite where:
   - `codeHash` matches
   - `usedAt` is null
   - `revokedAt` is null
   - `expiresAt` is in the future
4. If no invite matches, return a Dutch validation error.
5. Create the user with role `USER`.
6. Mark the invite as used in the same transaction.
7. Sign in the new user with the normal cookie.

The transaction should prevent two people from using the same code at the same time.

### 3. Admin invite API

Create admin-only routes, likely under `/api/admin`:

- `GET /api/admin/invites`
  - Lists invites with status: active, expired, revoked, used.
- `POST /api/admin/invites`
  - Body: recipient email.
  - Generates a short code and stores only the hash.
  - Sets `expiresAt` to now + 7 days.
  - Sends Dutch invite email with link to `/register?inviteCode=CODE`.
- `POST /api/admin/invites/:id/resend`
  - Resends an active unused invite.
  - If expired or revoked, return a clear Dutch error.
- `POST /api/admin/invites/:id/revoke`
  - Sets `revokedAt` for unused invites.
  - If already used, return a no-op/specific error depending on the final product decision.
- `GET /api/admin/users`
  - Lists normal user accounts only.
- `POST /api/admin/users/:id/impersonate`
  - Starts impersonation by issuing a new auth cookie with `sub` as the admin account and `impersonatingUserId` as the selected user id.
- `POST /api/admin/impersonation/stop`
  - Clears impersonation by issuing a new admin auth cookie without `impersonatingUserId`.

### 4. Admin creation from terminal

Add a terminal script, for example:

- `npm run admin:create -- --email admin@example.com --password "..."`

Implementation options:

- `backend/scripts/create-admin.ts`
- Validate strong password.
- Normalize email.
- Create `User` with role `ADMIN`.
- Refuse to create duplicate email.

This keeps first-admin setup private and repeatable.

### 5. SMTP email service

Replace the current Resend-only email helper with a generic email module:

- `backend/src/lib/email.ts`
- Supports SMTP in production using env vars.
- Supports log-only mode in development when SMTP is not configured.
- Sends multipart text + HTML invite emails.

Recommended env vars:

- `EMAIL_HOST=smtp.hostinger.com`
- `EMAIL_PORT=465`
- `EMAIL_USE_SSL=true`
- `EMAIL_USE_TLS=false`
- `EMAIL_HOST_USER=...`
- `EMAIL_HOST_PASSWORD=...`
- `DEFAULT_FROM_EMAIL=Finbar <...>`
- `SERVER_EMAIL=...`
- `PUBLIC_APP_URL=https://...`

Node package options:

- Use `nodemailer` for SMTP.
- Keep all credentials in environment variables and deployment secrets.

Email content should be Dutch and include:

- Clear subject, for example: `Uitnodiging voor Finbar`.
- Short explanation that the invite is valid for 7 days.
- Button/link to register.
- The short code in plain text for manual entry.

## Frontend plan

### 1. Registration page

Update `RegisterView.vue` and `useAuthStore.register()`:

- Add an invite code input field.
- Read `inviteCode` from the query string.
- Pre-fill the input when the invite link is opened.
- Send `inviteCode` in `POST /api/auth/register`.
- Show Dutch errors for invalid, expired, revoked, or already-used codes.

### 2. Admin area

Add an admin-only section, for example `/admin`:

- Invite users:
  - Email input.
  - Send invite button.
  - Invite list with status and expiry.
  - Revoke unused invite.
  - Resend active invite.
- Users:
  - List registered user accounts.
  - Button to impersonate a user.

Routing guard:

- Normal authenticated users cannot access `/admin`.
- Admins should land on the admin area after login.
- Users should land on the existing Finbar app.

### 3. Auth store changes

Extend frontend auth user state:

- `role`
- `impersonation`, for example:
  - `isImpersonating`
  - `impersonatedUser`
  - `adminUser`

`GET /api/auth/me` should return enough information for the UI banner and route guards.

### 4. Impersonation banner

Add a global banner visible whenever `isImpersonating` is true.

Banner behavior:

- Dutch text, for example: `Je bekijkt Finbar als [naam/e-mail].`
- Persistent and visually clear.
- Includes `Stop bekijken` action.
- The stop action calls `POST /api/admin/impersonation/stop`, refreshes auth state, and returns to `/admin`.

## Security and correctness notes

- Use a high-entropy invite code even though it is human-readable. Recommended: at least 10 to 12 characters from an unambiguous uppercase alphabet and digits.
- Hash invite codes in the database.
- Rate-limit invite code registration attempts if the app becomes public-facing. If no rate-limit middleware exists yet, record this as follow-up work before broad rollout.
- Keep admin routes strictly separated from impersonated user context.
- Do not allow admins to impersonate other admins.
- Ensure every existing user-owned API route uses the effective user id once impersonation exists.
- Existing data scoping by `userId` remains the main tenant isolation mechanism.

## Implementation phases

### Phase 1: Schema and backend foundations

- Add `AccountRole` enum and `User.role`.
- Add `Invite` model.
- Run Prisma migration.
- Add terminal admin creation script.
- Add role to login/register JWT payloads and `/me` responses.
- Add `requireAdmin` and effective-user-id helpers.

### Phase 2: Invite-only registration

- Add invite code generation and hashing utilities.
- Change registration API to require a valid invite code.
- Add invite use transaction.
- Update frontend registration form with invite code support.
- Add tests for valid, expired, revoked, used, and missing invite codes.

### Phase 3: SMTP and invite email

- Add SMTP email helper using environment variables.
- Add Dutch invite email template.
- Update env examples and deployment docs.
- Add log-only development behavior.

### Phase 4: Admin UI and invite management

- Add admin API routes for invite list/create/resend/revoke and user list.
- Add frontend admin routes and pages.
- Add admin route guard.
- Add invite status display.

### Phase 5: Impersonation

- Add admin impersonation start/stop routes.
- Add impersonation claims to the auth cookie.
- Replace user-owned route scoping with effective user id helper.
- Add frontend auth state for impersonation.
- Add global impersonation banner and stop action.
- Test that an admin can create/edit normal user data while impersonating.

### Phase 6: Hardening before broader rollout

- Add rate limiting for login/register/invite-code attempts.
- Add impersonation audit logging if needed.
- Add optional user notification policy if needed.
- Revisit multi-company structure if Finbar expands beyond one user per contractor company.

## Test plan

Backend:

- Admin creation script creates an admin and rejects duplicates.
- Admin can create an invite.
- Invite email/link contains the expected code and `/register?inviteCode=...` URL.
- Registration without code fails.
- Registration with invalid code fails.
- Registration with expired code fails.
- Registration with revoked code fails.
- Registration with used code fails.
- Registration with valid code creates a `USER`, marks invite used, and signs in.
- Admin-only routes reject normal users.
- Admin can start and stop impersonation.
- While impersonating, normal app routes read/write the impersonated user's data.
- Admin routes still use the real admin account, not the impersonated user.

Frontend:

- Register page pre-fills invite code from query string.
- Register page allows manual invite code entry.
- Admin routes are hidden or blocked for normal users.
- Admin invite list shows active, expired, revoked, and used states.
- Impersonation banner appears during impersonation.
- Stop impersonation returns the admin to the admin environment.

Manual production smoke test:

- Create admin from terminal.
- Log in as admin.
- Send invite email through Hostinger SMTP.
- Open invite link in a private browser.
- Register a user.
- Log back in as admin.
- Impersonate the user.
- Create/edit a project as that user.
- Stop impersonation and confirm admin environment returns.
