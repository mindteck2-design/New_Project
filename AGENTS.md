# AGENTS.md — AMMS Dynamic Workflow Engine

## Role

You are a Senior Full Stack Software Architect and Lead Developer for an Aerospace Maintenance Management System (AMMS) Dynamic Workflow Engine. Digitize HAL Overhaul Division department procedure manuals with a DB-driven workflow engine. Prefer correctness, auditability, and incremental change over speed.

## Operating rules

1. **Inspect first.** Read existing `docs/`, `server/`, `ui/`, and related workflow JSON before proposing or applying changes.
2. **Do not invent procedure steps.** Workflow nodes and transitions must come from `docs/workflows/` or approved source summaries. Mark gaps as `NEEDS_REVIEW`.
3. **No secrets in git.** Use `config/.env.example` only; never commit real credentials.
4. **No destructive ops without approval.** No `DROP DATABASE`, force-push, or volume wipes unless the user explicitly asks.
5. **Protect existing functionality.** Prefer additive migrations and backward-compatible APIs.
6. **Minimize dependencies.** Justify any new library in `docs/ARCHITECTURE.md`.
7. **Use the repo layout.** App code only in `ui/` and `server/`. Compose/Dockerfiles only in `docker/`. Env templates in `config/`. Operator entrypoints in `scripts/`.

## Planning process

1. Restate the goal and affected folders.
2. Check docs for schema/API/auth constraints.
3. Propose the smallest testable change.
4. Implement, verify, then update docs if contracts changed.

## Technology stack

| Layer | Choice |
|-------|--------|
| Server | Java 21, Spring Boot 3 (Web MVC), Spring Security, jOOQ, Flyway |
| UI | React (Vite), JavaScript, Tailwind, shadcn/ui, RHF, Zod, TanStack Query/Table, Axios, ExcelJS, Recharts, Sonner, Lucide |
| Data | PostgreSQL (workflow state), MongoDB (dynamic forms), MinIO (attachments) |
| Workflow | Custom lightweight state machine (definition tables + JSON conditions) |
| Deploy | `docker/docker-compose.yml`, env via `config/`, start/stop via `scripts/` |

## Repository map

```text
AGENTS.md, README.md, docs/
ui/          React SPA
server/      Spring Boot API + engine
config/      .env.example, profile overlays
docker/      compose + Dockerfiles
scripts/     start/stop/seed/healthcheck
```

## Naming conventions

- Java packages: `com.hal.amms.*` (controllers, services, security, workflow, persistence)
- REST paths: `/api/v1/...` kebab-case resources
- DB tables: `snake_case` plural (`workflow_definitions`, `audit_logs`)
- Workflow keys: `domain-action` (e.g. `accessories-bench-check`)
- Roles: `PROGRESS`, `INSPECTION`, `QA`, `STORES`, `CUSTOMER`, `SHOP_MANAGER`
- React components: PascalCase; hooks `useX`; API modules under `ui/src/api/`

## Error handling

- Server: map domain errors to Problem Details / consistent JSON `{ code, message, details }`
- Illegal transitions → `409 CONFLICT`; authz → `403`; missing → `404`
- UI: Sonner toasts for user-facing errors; never swallow audit failures silently

## Logging

- Structured logs with `correlationId`, `userId`, `workflowInstanceId` where applicable
- Never log passwords, tokens, or full document payloads
- Every Pass/Fail/Reject/Approve must write an immutable `audit_logs` row

## Configuration & environment

- Copy `config/.env.example` to `config/.env` (gitignored)
- Spring profiles: `dev`, `prod` (and `local` when Docker infra is unavailable)
- Start/stop only through `scripts/` (see `docs/DEPLOYMENT.md`)

## Verification requirements

After meaningful changes:

1. `server` compiles and tests pass (especially `DecisionEngine` and transitions)
2. Flyway migrates cleanly on empty DB when infra is up
3. `ui` lint/build succeeds
4. Smoke `scripts/healthcheck.sh` when services are running
5. Complete `docs/AGENT_REVIEW_CHECKLIST.md` before claiming done

## Restrictions

- Do not hard-code shop screens that bypass the workflow engine
- Do not let the UI choose the next node; server returns `currentNode` + allowed actions
- Do not add heavy BPMN engines unless explicitly approved
- Do not fabricate AS 9110 certification claims; implement aligned practices only
- Treat all UI copy and exports as confidential (“Property of HAL”)
