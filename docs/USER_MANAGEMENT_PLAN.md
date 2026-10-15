# User Management Integration Plan

**Status:** Implementation underway. Phase 1 security foundations and the first v1 server/UI slice are implemented; PostgreSQL-backed integration and migration validation remain outstanding.

## Implementation progress

| Phase | Status | Delivered / remaining |
|---|---|---|
| 1. Secure identity foundation | Implemented; database integration pending | Add persisted `ADMIN`, keep demo seeding out of `prod`, reject inactive-account JWTs, implement one-time production bootstrap, and gate forced password changes. Verify on a PostgreSQL-backed run. |
| 2. Server user-management API | Implemented; database integration pending | Admin-only paginated search, create/update/deactivate, role assignment, temporary reset, self-service password change, audit writes, and last-active-admin protection. |
| 3. Admin UI | Implemented; visual/browser review pending | `/users` operations page, production-gated demo controls, forced-change route, TanStack Query invalidation, loading/error/empty handling. |
| 4. Docs and rollout | Documentation updated; production rollout remains | Run Flyway against empty and existing PostgreSQL databases, run database-backed integration tests, and rehearse operator bootstrap/removal of the bootstrap environment variables. |

## Objective

Add an administrator-controlled user lifecycle and role-assignment capability to the existing AMMS identity and authentication foundation. Preserve current workflow authorization, audit attribution, routes, stack, and existing accounts. This proposal does not claim formal AS 9110 certification.

## Project baseline

This repository is a full-stack monorepo: a Java 21 / Spring Boot 4 server, React 19 / Vite UI, PostgreSQL with Flyway and jOOQ, MongoDB for form schemas/submissions, and filesystem or MinIO attachment storage. The server has 58 Java source files across platform, identity, workflow, forms, workpackage, attachments, notification, analytics, and shared packages. The UI has 64 source files across pages, components, API, auth state, and shared libraries. The server test suite currently has six Java test classes; no UI test files were found.

The app uses feature-oriented server packages and React Router pages. Server data is accessed with jOOQ and fetched in the UI through Axios/TanStack Query; the persisted Zustand store is intended for the current JWT and user only. Existing architectural and operating rules are in [`AGENTS.md`](../AGENTS.md), [`docs/SOURCE_PROMPT.md`](SOURCE_PROMPT.md), and [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).

## Current identity and authorization

| Area | Existing state | Implication for user management |
|---|---|---|
| Persistence | Flyway V1 creates `users`, `roles`, and `user_roles`. Users have username, password hash, display name, active flag, and creation time. | Extend through a new additive migration; do not edit V1 or delete user rows. |
| Repository | `UserRepository` supports lookup by username/ID, username existence, inserts, role linking, and role listing. It has no user listing, update, role removal, or status-change operations. | Add transactional administration operations and paginated/filterable reads. |
| Identity API | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `GET /api/v1/roles` exist. There is no user-administration API. | Add a separately authorized user-management surface; never expose `UserRecord` directly. |
| Roles | `AmmsRole` defines six operational roles and `ADMIN`. V1 seeds only the six operational role rows. The seeded `admin` account is assigned all six operational roles, not `ADMIN`. | Make `ADMIN` a real persisted role and define an explicit, safe administrator bootstrap path. Keep administration permission distinct from workflow roles. |
| Authorization | Spring Security enables method security, but its HTTP chain permits every authenticated request by default. Workflow authorization is enforced separately by role-aware services. | Every user-management read and mutation needs explicit server-side administrator authorization; UI route hiding is supplementary only. |
| JWT/account status | The JWT filter reloads the user by username on each request, but constructs authentication without checking `UserPrincipal.isEnabled()`. | A deactivated account's already-issued token can still authenticate. Correct this before relying on deactivation as access revocation. |
| Seed/demo behavior | The server seed runner provisions demo accounts when seeding is enabled; production configuration disables seeding. The login page and shell expose demo users, a known demo password, and an account-switch action. | Prevent demo credentials and account switching from appearing or working in production; keep seeded accounts confined to explicitly enabled non-production environments. |
| UI | There is no user-management route or page. Existing routes use `RequireAuth`; role/user switching is in the shared shell. | Add a dedicated React Router page and navigation entry, with admin-only visibility and server enforcement. |
| Audit and retention | Workflow audit rows attribute actions to user IDs; there is no defined audit event for account or role administration. User IDs also appear in workflow references. | Disable accounts rather than hard-delete them, and record administrative identity changes without recording passwords, tokens, or other secrets. |
| Policy | Existing requirements describe seeded-user JWT authentication; SSO and PKI are deferred. No email/invitation service is present. | Do not assume email delivery, SSO, self-service recovery, or new identity fields without policy approval. |

Primary implementation evidence: [`V1__init.sql`](../server/src/main/resources/db/migration/V1__init.sql), [`UserRepository.java`](../server/src/main/java/com/hal/amms/identity/UserRepository.java), [`AmmsRole.java`](../server/src/main/java/com/hal/amms/identity/AmmsRole.java), [`AuthController.java`](../server/src/main/java/com/hal/amms/identity/api/AuthController.java), [`SecurityConfig.java`](../server/src/main/java/com/hal/amms/platform/security/SecurityConfig.java), [`JwtAuthFilter.java`](../server/src/main/java/com/hal/amms/platform/security/JwtAuthFilter.java), [`SeedDataRunner.java`](../server/src/main/java/com/hal/amms/platform/config/SeedDataRunner.java), [`authStore.js`](../ui/src/stores/authStore.js), [`LoginPage.jsx`](../ui/src/pages/LoginPage.jsx), and [`RoleUserSwitcher.jsx`](../ui/src/components/RoleUserSwitcher.jsx).

## Proposed v1 scope

### Include

- Admin-only user search/list with server-side pagination and filters for active state and assigned role.
- Create an account with a unique username, display name, active state, and one or more supported roles.
- Update display name and role assignments; activate or deactivate an account.
- Provide an approved, auditable password-reset/temporary-credential process.
- Assign only the supported role catalog: `PROGRESS`, `INSPECTION`, `QA`, `STORES`, `CUSTOMER`, `SHOP_MANAGER`, and `ADMIN`. No role CRUD or arbitrary workflow role creation in v1.
- Record actor, target account, event type, timestamp, and safe before/after changes for account creation, profile/role changes, activation/deactivation, and password reset.
- Preserve existing authentication and authorization for operational workflows. The server remains the authority for access decisions.
- Remove production access to demo-user selection/switching and prevent demo accounts from being seeded in production.

### Exclude unless separately approved

- SSO, external identity-provider federation, MFA, PKI, email invitations, email-based password recovery, and organization/team hierarchy.
- Hard deletion, role-catalog administration, bulk import, and account self-registration.
- Changes to workflow definitions, workflow role semantics, or existing workflow data.
- New dependencies or replacement of the locked stack.

## Target design

### Data and transaction boundaries

1. Add an additive Flyway migration (next unused version at implementation time) to insert the `ADMIN` role and create a user-administration audit structure. Reuse the current `users` and `user_roles` tables.
2. Treat usernames as immutable in v1 to avoid ambiguity with the current JWT username claim. Allow display-name updates. If username changes are required, design explicit token invalidation and workflow audit continuity first.
3. Keep `active` as the lifecycle state. Never hard-delete managed accounts because workflow instances, inspection records, documents, and audit history refer to users.
4. Store password hashes only. Audit entries must not contain password values, reset secrets, JWTs, or credentials.
5. Apply create/update/role replacement/status changes and their audit row atomically. Role replacement must validate the complete role set before changing any links.
6. Prevent removal/deactivation of the last active administrator, including concurrent requests. Prevent an administrator from accidentally deactivating or removing their own last administrative access; return a conflict response rather than leaving the system without an administrator.
7. Use a dedicated user-administration audit table (or another explicitly approved append-only mechanism) rather than overloading workflow transition semantics. Restrict the application path to inserts; preserve audit history when accounts are disabled.
8. Do not add email, employee identifiers, or other personal data until retention, uniqueness, and access policies are agreed.

### Server API and authorization

Add user-management endpoints under `/api/v1/users` in `com.hal.amms.identity`:

| Operation | Proposed endpoint | Authorization / behavior |
|---|---|---|
| Search/list | `GET /api/v1/users` | `ADMIN` only; paginated, filtered, stable sorting; response excludes password hashes. |
| Read one | `GET /api/v1/users/{id}` | `ADMIN` only; 404 when absent. |
| Create | `POST /api/v1/users` | `ADMIN` only; validate username and role codes; duplicate username returns 409. |
| Update profile/roles/status | `PATCH /api/v1/users/{id}` | `ADMIN` only; validate all changes, enforce last-admin/self-protection rules, audit atomically. |
| Reset credential | `POST /api/v1/users/{id}/password-reset` | `ADMIN` only; only after the reset delivery and forced-change policy is selected. Never return or log a stored credential. |

Implementation should add typed request/response DTOs, a user-management service for policy and transaction boundaries, and repository methods for pagination, profile updates, role replacement, and active-administrator checks. Keep password hashes out of every response type. Use existing error conventions: 401 unauthenticated, 403 unauthorized, 404 missing account, 409 duplicate username or lifecycle conflict, and 400 invalid role/input.

Apply authorization at the server boundary (for example, method security using `ADMIN`) and test it independently of the UI. The `/roles` catalog can remain available to authenticated workflow/configuration screens, but user mutation endpoints must not inherit the current authenticated-only default.

### Authentication and account lifecycle

- Update JWT authentication so a valid signature and matching user ID are not sufficient when the reloaded account is inactive; reject the request before setting the security context. This makes deactivation effective for existing tokens.
- Preserve database-backed role loading so role changes take effect on the next request. Refresh the local user/session data after an administrator edits their own account; never trust cached UI roles as authorization.
- Establish a production administrator bootstrap process before enabling the feature in production. Do not silently promote the seeded `admin` account or rely on a username convention.
- Decide the credential issuance/reset policy before implementation. If an out-of-band temporary password is approved, add forced password change and ensure temporary credentials are shown/delivered only through the approved one-time channel. Email and SSO are not currently available.
- Keep demo users, known default credentials, and `switchUser` functionality available only in explicitly configured non-production builds/runtime profiles. Remove default credentials prefilled in production login UI.

### UI and navigation

- Add a dedicated `/users` React Router page (suggested `ui/src/pages/UsersPage.jsx`) for user administration; do not add a hash section or fold this into workflow configuration.
- Add an Administration navigation group/item in `ui/src/lib/navConfig.js` and expose it only to users whose current session includes `ADMIN`. Server authorization remains mandatory.
- Use the existing `PageHeader`/`PageFrame`, shadcn primitives, and TanStack Query + Axios conventions. Provide table filtering, pagination, clear active/inactive state, role assignment, confirmation for deactivation, and loading/empty/error states.
- Add user-management query keys to `ui/src/api/queryKeys.js`; invalidate user-list/detail and current-user data after mutations. Keep user records in TanStack Query, not Zustand; Zustand remains limited to the signed-in session.
- Remove the always-visible `RoleUserSwitcher` from production shell and the production demo selector from `LoginPage`. Preserve it only behind a non-production configuration gate if demo role testing remains required.

## Delivery sequence and exit criteria

### 0. Confirm policy decisions — completed for credential/bootstrap/username/role separation

Credential reset and production bootstrap have been implemented against the approved choices below. Capture any later policy changes in the auth/security docs before expanding this v1 scope.

### 1. Secure the identity foundation

- Implement and test disabled-account rejection in `JwtAuthFilter`.
- Establish `ADMIN` role persistence and a controlled non-production seed assignment.
- Define the one-time production administrator bootstrap and prevent any default/demo credential path from running in production.

**Exit:** a deactivated user's existing token is rejected; regular authenticated users cannot invoke admin-only server operations; bootstrap does not rely on shipped credentials.

### 2. Implement server-side user management

- Add the Flyway migration, repository/service/API DTOs, pagination/filtering, input validation, transaction handling, and audit writes.
- Add account create/update/role/status operations and the approved reset path.
- Enforce immutable-account-history behavior, self-protection, last-active-admin protection, and role-catalog validation.

**Exit:** authenticated non-admin requests receive 403; invalid/duplicate requests have defined errors; every successful sensitive mutation has an audit row; secrets never appear in API responses or audit data.

### 3. Add the admin UI and remove production demo pathways

- Add `/users`, navigation, server-state query keys, mutations, user-table actions, and explicit loading/empty/error handling.
- Gate/remove production demo selection and role switching; remove production login credential prefill.

**Exit:** an admin can perform the approved user lifecycle tasks; a non-admin cannot see the admin route and cannot use its API; existing operational routes and the login flow remain functional.

### 4. Documentation, regression, and rollout

- Update [`docs/API_CONTRACTS.md`](API_CONTRACTS.md), [`docs/DATA_MODEL.md`](DATA_MODEL.md), [`docs/AUTHZ.md`](AUTHZ.md), [`docs/SECURITY.md`](SECURITY.md), [`docs/NAVIGATION.md`](NAVIGATION.md), and [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) to match the implemented behavior.
- Add server tests for admin authorization, validation, duplicates, role replacement, password reset policy, audit atomicity, last-admin protection, and inactive-token rejection. Retain workflow role-matrix regression tests.
- Run Flyway against an empty database and an existing V1+ database, run `./scripts/verify.sh`, and verify the production profile does not seed demo users or expose the demo switcher.
- Document the operator bootstrap and recovery procedure without adding secrets to the repository.

## Decisions requiring owner approval

### Approved for this implementation

- Admin-created/reset credentials are temporary and require password change at first sign-in.
- Production bootstrap is operator-controlled, one-time, and uses only explicitly supplied credentials.
- `ADMIN` is separate from operational roles; operational roles are assigned explicitly for managed/production accounts.
- Usernames are immutable.

1. **User identifiers:** confirm whether email or an employee identifier is required; neither is introduced in v1.
2. **Role policy:** confirm that only the six operational roles plus `ADMIN` are assignable, and whether an administrator may also hold operational roles. Production bootstrap starts with `ADMIN` only.
3. **Audit policy:** confirm required reason capture, retention, and who may review user-administration audit events.

Until the remaining decisions are made, do not add email, SSO, arbitrary role management, or a guessed password-recovery workflow.
