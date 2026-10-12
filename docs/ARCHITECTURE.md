# Architecture Decisions

## Overview

React SPA (`ui/`) calls Spring Boot (`server/`). Workflow definitions and instance state live in PostgreSQL. Dynamic form schemas/submissions use MongoDB (JSONB fallback on `local` profile). Attachments use MinIO (filesystem fallback on `local`).

```text
scripts → docker compose (or local infra)
              ├─ PostgreSQL
              ├─ MongoDB
              ├─ MinIO
              └─ server  ←── ui
config/ supplies env to both
```

## ADR-001: Custom state machine (not Camunda)

**Decision:** Store definitions in SQL/JSON; execute via `WorkflowService` + `DecisionEngine`.  
**Why:** Shop charts are decision-heavy but not full BPMN; keep ops light and definitions editable.  
**Revisit if:** Multi-instance compensation, timers, or human-task inbox complexity explode.

## ADR-002: PostgreSQL + MongoDB

**Decision:** Relational for workflow/RBAC/audit; document store for dynamic forms.  
**Why:** Form shapes vary per QM form (Route Card, SACL, memos).  
**Fallback:** Profile `local` stores forms in `form_documents` JSONB when Mongo is down.

## ADR-002b: jOOQ (not JPA)

**Decision:** PostgreSQL access via **jOOQ** DSL + Flyway schema; no Hibernate/JPA entities.  
**Why:** Typed SQL, explicit queries, fits audit/workflow transition logic; matches project stack.  
**Codegen (required):** `jooq-codegen-maven` + `DDLDatabase` generates `com.hal.amms.jooq.*` from `server/src/main/resources/db/migration/*.sql` during `generate-sources`. Flyway SQL is the schema source of truth — do not hand-maintain table/column meta. Use `import static com.hal.amms.jooq.Tables.*` and typed fields (`USERS.ID`, `WORKFLOW_INSTANCES.STATUS`).  
**When DDLDatabase is not enough:** Postgres-only DDL (partial indexes, exotic types) that the H2-backed parser rejects — switch the Maven profile to JDBC codegen against a migrated Postgres (Testcontainers / `testcontainers-jooq-codegen-maven-plugin`).

## ADR-002e: Configure / Execute / Track navigation

**Decision:** Sidebar groups map to AMMS business layers — not engine jargon.  
**Labels:** Form Master, Workflow Master, Work packages, Pending actions, Maintenance runs.  
**Process map:** Not a top-level menu; chart lives under Workflow Master detail; `/process*` redirects.  
**Detail:** [`docs/NAVIGATION.md`](NAVIGATION.md), `ui/src/lib/navConfig.js`.

## ADR-002d: Single date/time policy (calendar vs instant)

**Decision:** One canonical helper on each side — server `AmmsDateTimes`, UI `ui/src/lib/dateTime.js`.  
**Rules:**

| Kind | Storage / wire format | Examples |
|------|----------------------|----------|
| Calendar date | `YYYY-MM-DD` / `LocalDate` | DOB, schedule day |
| Timestamp | UTC `Instant` ISO-8601 (`…Z`) | `createdAt`, audit |

**Why:** Converting a date-only value through `Date`/`Instant` midnight + local TZ is the classic “saved 1 Aug, retrieved 2 Aug” bug. Calendar dates must never be timezone-shifted; extract `YYYY-MM-DD` from the string prefix when normalizing.

## ADR-002c: Package-by-feature (2026)

**Decision:** Server code is organized by **feature module**, not by technical layer (`dao` / `service` / `web`).  
**Layout:**

```text
com.hal.amms
├── platform/          # cross-cutting: config, security, ApiException
├── identity/          # users, roles, auth API
├── workflow/          # engine (WorkflowService, DecisionEngine), repository, domain, API
├── workpackage/       # aircraft/accessory packages
├── notification/
├── analytics/
├── forms/             # Mongo dynamic forms
└── attachments/       # MinIO / filesystem
```

**Why:** Matches modern Spring Boot modular-monolith practice; keeps each capability cohesive (API + service + repository + DTOs together). Required engine types stay under `workflow/`.

## ADR-003: Monorepo folders

**Decision:** `ui/`, `server/`, `config/`, `docker/`, `scripts/`, `docs/`.  
**Why:** Matches operator mental model; compose stays under `docker/`; scripts are the only supported entrypoints.

## ADR-004: Server-driven navigation

**Decision:** UI renders whatever `currentNode` the API returns.  
**Why:** Prevents client-side bypass of decision logic and RBAC.

## ADR-005: JWT for MVP auth

**Decision:** Stateless JWT with role claims; seeded users for dev.  
**Why:** Simple for local/demo; SSO can replace later without changing RBAC checks.

## ADR-006: Attachment storage

**Decision:** MinIO (S3 API); local disk under `.data/attachments` on `local` profile.  
**Why:** Secure object storage with ACL checks in `DocumentService`.

## Dependency policy

Add libraries only when existing stack cannot cover the need. Record additions here.

| Addition | Reason |
|----------|--------|
| `spring-boot-starter-data-mongodb` | Dynamic `form_schemas` + `form_submissions` when `amms.forms.store=mongo` (ADR-002; default for local/dev/prod) |
| `io.minio:minio` | `MinioAttachmentStore` when `amms.attachments.store=minio` (ADR-006) |
| `zustand` (UI) | Global client session (auth token/user); server state stays in TanStack Query |
| `@tanstack/react-table`, `recharts`, `exceljs` (UI) | Plan stack: instance table, status chart, confidential exports |
