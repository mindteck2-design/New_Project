# Production readiness — assessment & gap plan

**Verdict: not production-ready today.** The repo is a solid **MVP vertical slice** (Accessories + NDT, JWT, jOOQ engine, clickable action inbox). It is **not** yet suitable for multi-year HAL Overhaul Division production without the gaps below.

## What already works (MVP)

| Area | Status |
|------|--------|
| DB-driven definitions + `DecisionEngine` | Working |
| Server-driven next step (UI never picks node) | Working |
| RBAC on transitions / instance visibility | Working |
| Clickable notifications → instance action page | Working (client-derived from open instances) |
| Audit log for decisions/transitions | Working |
| Attachments ACL + download | Working |
| Dual forms store (PG / Mongo) + MinIO stub | Working |
| Compose / scripts / verify | Working for demos |

## Critical gaps (block production)

### G1 — Durable notification system
- **Today:** Inbox derived by polling instances + matching `currentNode.roleCode`.
- **Need:** Persisted `workflow_notifications` (+ per-user read state), created on every transition that assigns a role; optional email/SMS later; click always deep-links to `/instances/{id}` action page.
- **5-year:** Retention / archive of old notifications; index by role + time.

### G2 — Role-curated analytics dashboards
- **Today:** One shared operations dashboard; charts are global instance counts.
- **Need:** Per-role home: Progress (handoffs waiting), Inspection (open checks / fail rate), QA (endorse queue), Stores (N/A until Stores workflow), Shop Manager (repair WIP), Customer (acceptance status).
- **5-year:** Materialized daily rollups; Excel/PDF operational reports.

### G3 — Workflow design completeness
- **Today:** 2 seeded charts; aircraft/Stores/plating/metrology inventory only.
- **Need:** Import remaining charts from summaries; versioned definition publish; NEEDS_REVIEW resolution workflow; admin definition editor (optional).

### G4 — Database architecture for ~5 years growth
- **Today:** Single Flyway V1 schema, no partitioning, limited indexes.
- **Need:** Hot-path indexes; partition or archive `audit_logs` / `form_documents` by year; retention policy; read replicas for reporting; backup/PITR runbooks.
- **Estimate drivers:** ~10k–100k instances/year × dozens of audit rows × attachments.

### G5 — Production reporting
- **Today:** Client Excel export of filtered instances.
- **Need:** Server-side scheduled reports (throughput, MTTR, fail/condemn rates by shop), signed PDF with HAL banner, role-scoped datasets.

### G6 — Security & ops hardening
- SSO / PKI signatures (MVP uses typed placeholder)
- Secret management (Vault/KMS), rotated JWT keys
- Horizontal scale, health probes, OTEL
- MinIO + Mongo mandatory in prod profile (no silent filesystem fallback)
- Penetration test / AS 9110 evidence pack (practices, not certification claims)

## Phased gap closure plan (post-MVP)

| Phase | Focus | Exit criteria |
|-------|--------|----------------|
| **P7** | Durable notifications + deep-link actions | DB notifications; mark-read; bell + toast from API |
| **P8** | Role analytics API + role dashboard UI | Each role sees curated KPIs + waiting queue |
| **P9** | DB longevity (indexes, archive, backups) | V2+ migrations; backup restore drill documented |
| **P10** | Operational reports (ExcelJS/PDF server) | Role-scoped monthly export job |
| **P11** | Remaining shop workflows | Stores + one aircraft slice runtime |
| **P12** | Prod security (SSO, MinIO/Mongo enforced, secrets) | Prod profile checklist green |

## Immediate increments in this repo

P7/P8 starters ship alongside MVP hardening:

- Flyway **V2**: notification tables + production indexes
- `GET /api/v1/notifications`, `POST .../read`
- `GET /api/v1/analytics/me` — role-curated metrics
- Role analytics panel on `WorkflowDashboard`

Remaining P9–P12 stay deferred until explicitly approved.
