# AMMS Dynamic Workflow Engine

Digitizes HAL Overhaul Division process charts as a **DB-driven workflow engine** with RBAC, decision nodes, dynamic forms, and immutable audit logs.

**Authoritative brief:** [`docs/SOURCE_PROMPT.md`](docs/SOURCE_PROMPT.md) · Agent rules: [`AGENTS.md`](AGENTS.md)

## Layout (prompt-aligned)

| Path | Purpose |
|------|---------|
| `.env.example` → `.env` | **Top-level** runtime env (prompt requirement) |
| `ui/` | React (Vite) SPA — **shadcn/ui** primitives only |
| `server/` | Spring Boot + **jOOQ** + Flyway + Security |
| `config/` | Profile overlays + UI `VITE_*` templates |
| `docker/` | Compose + Dockerfiles (Postgres, Mongo, MinIO, server) |
| `scripts/` | start / stop / health / verify / seed |
| `docs/` | Architecture, contracts, workflow JSON |

## Locked stack

- **Backend:** Java 21, Spring Boot (Web MVC), Spring Security, jOOQ, Flyway, profiles `dev` / `prod` / `local`
- **Frontend:** React (JS), Tailwind, **shadcn**, React Hook Form, Zod, TanStack Query, TanStack Table, Axios, ExcelJS, Recharts, Sonner, Lucide
- **Data:** PostgreSQL (workflow state), MongoDB (dynamic forms), MinIO (attachments)
- **Workflow:** Custom state machine — UI never chooses the next node
- **Identity:** Admin-managed accounts and explicit role assignments (`/users`)

## Required UI building blocks

- `WorkflowDashboard` — `ui/src/pages/WorkflowDashboard.jsx`
- `DynamicForm` — `ui/src/components/DynamicForm.jsx`
- `DecisionNode` — `ui/src/components/DecisionNode.jsx`

## Quick start

```bash
cp .env.example .env
# Ensure PostgreSQL matches POSTGRES_* in .env
./scripts/start-services-local.sh
./scripts/start-ui.sh
./scripts/healthcheck.sh
```

- UI: http://127.0.0.1:5173  
- API: http://127.0.0.1:8080/api/v1 (dev UI uses same-origin `/api` Vite proxy)  
- Seeded password: `Passw0rd!` (`admin`, `inspection.user`, `progress.user`, …)
- User-management design and rollout: [`docs/USER_MANAGEMENT_PLAN.md`](docs/USER_MANAGEMENT_PLAN.md)

## Docker

```bash
cp .env.example .env
./scripts/start-services.sh
./scripts/start-ui.sh
```

## Verify

```bash
./scripts/verify.sh
```

## MVP workflows

- Accessories Bench Check / Repair
- NDT Radiography

## Work packages (PO/SO)

Master workflows stay as templates. Shop execution uses **work packages** mapped to aircraft **PO/SO** with testing type **ROUTINE** or **REPAIR**. Operators add parts, open them one by one (starts a workflow instance), complete disassemble → test → reassemble steps, and view the consolidated **test report** in-app.

- UI: `/packages` · API: `/api/v1/packages`
- Design: [`docs/AIRCRAFT_WORK_PACKAGE.md`](docs/AIRCRAFT_WORK_PACKAGE.md)

Deferred aircraft A-2/A-3/A-4, Stores, plating — see `docs/workflows/INVENTORY.md`.
