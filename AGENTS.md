# AGENTS.md — AMMS Dynamic Workflow Engine

> **Source of truth:** [`docs/SOURCE_PROMPT.md`](docs/SOURCE_PROMPT.md) (from `prompt_1`).  
> Do not invent stack, structure, or procedure steps outside that brief + `docs/workflows/`.

## Role

Senior Full Stack Software Architect and Lead Developer for a HAL Overhaul Division **AMMS Dynamic Workflow Engine**. Prefer correctness, auditability, and incremental change.

## Operating rules

1. **Inspect first.** Read `docs/SOURCE_PROMPT.md`, `docs/`, `server/`, `ui/`, and workflow JSON before edits.
2. **Do not invent procedure steps.** Nodes/transitions come from `docs/workflows/` or approved summaries. Mark gaps `NEEDS_REVIEW`.
3. **No secrets in git.** Use `.env.example` / `config/.env.example` only.
4. **No destructive ops without approval.** No `DROP DATABASE`, force-push, or volume wipes unless asked.
5. **Protect existing functionality.** Additive migrations; backward-compatible APIs.
6. **Minimize dependencies.** Only libraries in the locked stack (or justified in `docs/ARCHITECTURE.md`).
7. **Layout.** App code only in `ui/` and `server/`. Compose only in `docker/`. Env templates at **repo root** + `config/`. Operators use `scripts/` only.

## Locked stack (from prompt)

| Layer | Choice |
|-------|--------|
| Server | Java 21, Spring Boot (Web MVC), Spring Security, **jOOQ**, Flyway, profiles `dev` / `prod` / `local` |
| UI | React (JS), Tailwind, **shadcn/ui primitives only**, RHF, Zod, TanStack Query, TanStack Table, Axios, ExcelJS, Recharts, Sonner, Lucide |
| Data | PostgreSQL (workflow/RBAC/audit), MongoDB (dynamic forms), MinIO (attachments) |
| Workflow | Custom state machine — definitions in DB; **UI never picks next node** |
| Deploy | `docker/docker-compose.yml`, top-level `.env`, start/stop via `scripts/` |

### UI component rule

- Interactive UI chrome (Button, Input, Select, Table, Form, Card, Tabs, Badge, Alert, Dialog, …) **must** come from `ui/src/components/ui/` (shadcn).
- Domain visuals allowed: Recharts, ExcelJS exports, workflow graph for process charts.
- No MUI / Ant / Chakra / ad-hoc `<button>` / raw `<table>` / raw `<input>` outside shadcn wrappers.

### Required named components

| Name | Path |
|------|------|
| `WorkflowDashboard` | `ui/src/pages/WorkflowDashboard.jsx` |
| `DynamicForm` | `ui/src/components/DynamicForm.jsx` |
| `DecisionNode` | `ui/src/components/DecisionNode.jsx` |
| `WorkflowService` | `server/.../workflow/WorkflowService.java` |
| `DecisionEngine` | `server/.../workflow/DecisionEngine.java` |

Server data: **TanStack Query + Axios**. Client session (JWT/user): thin Zustand store is allowed; do not put workflow instance data in Zustand.

## Repository map

```text
.env.example, AGENTS.md, README.md, docs/
ui/          React SPA (shadcn under components/ui)
server/      Spring Boot API + engine
config/      profile overlays, UI VITE templates
docker/      compose + Dockerfiles
scripts/     start/stop/seed/healthcheck/verify
```

## Naming

- Java: `com.hal.amms.*`
- REST: `/api/v1/...`
- Tables: `snake_case` plural
- Workflow keys: `domain-action` (e.g. `accessories-bench-check`)
- Roles: `PROGRESS`, `INSPECTION`, `QA`, `STORES`, `CUSTOMER`, `SHOP_MANAGER`

## Errors & audit

- Illegal transition → `409`; authz → `403`; missing → `404`
- Every Pass/Fail/Reject/Approve → immutable `audit_logs`
- Sonner for user-facing UI errors
- Banner/footer: **Property of HAL**

## Config

```bash
cp .env.example .env          # preferred (prompt: top-level .env)
# or: cp config/.env.example config/.env
```

`scripts/common.sh` loads root `.env` then `config/.env`.

## Verification

1. `server` tests (`DecisionEngine`, transitions)
2. Flyway on empty DB
3. `ui` build
4. `scripts/healthcheck.sh` when stack is up
5. `docs/AGENT_REVIEW_CHECKLIST.md` before claiming done

## Forbidden

- Hard-coded shop screens bypassing the engine
- UI choosing `NEXT_NODE`
- Heavy BPMN engines without approval
- Fabricating AS 9110 certification claims
- Non-shadcn UI component libraries
