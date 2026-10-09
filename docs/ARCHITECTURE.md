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
**Codegen:** Optional generated classes under `com.hal.amms.jooq`; MVP may use string/table field DSL bound to Flyway tables.

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
