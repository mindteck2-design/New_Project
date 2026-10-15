# Implementation phases — status

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | `AGENTS.md`, `docs/*`, workflow JSON inventory | **Complete** |
| 1 | Monorepo layout (`ui`, `server`, `config`, `docker`, `scripts`) | **Complete** |
| 2 | Platform skeleton: Spring Boot + jOOQ + Flyway, Vite UI, Compose, scripts | **Complete** |
| 3 | Workflow engine: definitions, instances, `DecisionEngine`, unit tests | **Complete** |
| 4 | Accessories Bench Check vertical slice (API + UI + audit) | **Complete** |
| 5 | NDT Radiography second workflow | **Complete** |
| 6 | Hardening: RBAC on instances/docs, attachment ACL download, integration tests, verify script | **Complete** |
| 7 | User management v1: admin identity, user lifecycle API/UI, temporary credentials, audit and production bootstrap | **Implemented; PostgreSQL-backed verification pending** |

## Phase 6 deliverables

- `AttachmentStore` — filesystem (`local`/`test`) or MinIO (`dev`/Compose via `amms.attachments.store=minio`)
- `GET /api/v1/instances/{id}/documents/{docId}/content` — authenticated download
- Instance list/get filtered by role / participation / starter
- `WorkflowApiIntegrationTest` — 403 wrong role, FAIL→repair, 400 missing decision
- `scripts/verify.sh` — server tests, UI build, optional healthcheck
- Modern UI: shadcn theme, XYFlow charts, role switcher, actionable notifications
- `FormSubmissionStore` + `form_schemas`: **MongoDB** by default (`amms.forms.store=mongo`, ADR-002); PostgreSQL JSONB is offline/test fallback only
- Dashboard instance insights: TanStack Table, Recharts, ExcelJS export
- Dynamic form schema CRUD UI (`/forms`) backed by MongoDB

## Production readiness

**Not production-ready yet.** Gap plan + P7/P8 starters: [`docs/PRODUCTION_GAPS.md`](PRODUCTION_GAPS.md)

- Flyway **V2**: durable `workflow_notifications` + longevity indexes
- `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`
- `GET /api/v1/analytics/me` + role analytics panel on `WorkflowDashboard`
- Click notification → `/instances/{id}` action page (mark-read when persisted)

## Deferred (post-MVP / P9–P12)

- Full aircraft A-2/A-3/A-4 runtime workflows (inventory in `docs/workflows/INVENTORY.md`)
- PKI digital signatures, SSO, IFS/AMMS integrations
- Stores / plating / metrology chart imports
- Partitioned audit archive, server PDF reports, Vault secrets

## Phase 7 — user management

Implemented in [`docs/USER_MANAGEMENT_PLAN.md`](USER_MANAGEMENT_PLAN.md): admin-only user management at `/users`; role/status changes and password resets are audited; temporary passwords are changed before normal API access; inactive JWTs are rejected; production bootstrap is operator-controlled. Seeded demo accounts and role switching are restricted to non-production profiles/builds.

**Verification pending:** this environment's configured PostgreSQL test credentials are rejected. Run Flyway and database-backed API integration tests against approved empty and existing test databases before rollout.

## Agent review checklist (Phase 6 dry-run)

Completed against [`docs/AGENT_REVIEW_CHECKLIST.md`](AGENT_REVIEW_CHECKLIST.md):

- Docs/code inspected; no invented procedure steps; inventory marks deferred charts
- RBAC on transitions/documents; audit on Pass/Fail/Complete; attachment download authenticated
- UI never chooses next node; DecisionEngine + integration tests cover PASS/FAIL, 403, 409, 400
- `./scripts/verify.sh` green (server tests + UI build + healthcheck)
- Secrets only in `.env` / `config/.env` (examples committed)

## Verify locally

```bash
./scripts/verify.sh
./scripts/healthcheck.sh   # when stack is running
```
