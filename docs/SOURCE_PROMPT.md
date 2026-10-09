# Source prompt (authoritative)

This project is governed by the original AMMS brief (`prompt_1`). Agents must follow it for stack, structure, and component names. Do not invent alternate architecture.

## Role

Senior Full Stack Software Architect / Lead Developer for an Aerospace Maintenance Management System (AMMS) **Dynamic Workflow Engine** (HAL Overhaul Division), AS 9110 C–aligned practices, confidentiality, RBAC.

## Locked technology stack

| Layer | Required |
|-------|----------|
| Backend | Java 21, Spring Boot (Web MVC), Spring Security, **jOOQ**, profiles (`dev`, `prod`, …) |
| Frontend | React (JS), Tailwind CSS, **shadcn/ui only for UI primitives**, React Hook Form, Zod, TanStack Query, TanStack Table, Axios, ExcelJS, Recharts, Sonner, Lucide |
| Data | PostgreSQL (workflow state), MongoDB (dynamic forms), Flyway migrations |
| Objects | MinIO |
| Workflow | Custom lightweight state machine / BPMN-lite (definitions in DB) — **no Camunda/Flowable unless approved** |
| Deploy | Docker Compose, **top-level `.env`** (and `config/` overlays) |

**Do not** introduce alternate UI kits (MUI, Ant, Chakra, custom HTML controls for buttons/inputs/tables/forms).  
**Do not** hard-code shop screens that bypass the workflow engine.  
**UI never chooses the next node** — server returns `currentNode` + allowed actions.

## Required frontend building blocks (exact names)

- `WorkflowDashboard` — current work / definitions / instances
- `DynamicForm` — fields from current node `formKey`
- `DecisionNode` — Pass/Fail / Yes/No (or configured options); triggers transition API
- TanStack Query for all server data fetching/caching

## Required backend building blocks

- `WorkflowService` — load definitions, start instances, execute transitions
- `DecisionEngine` — evaluate transition conditions
- Controllers: start workflow, execute step, submit form, approve/audit
- Spring Security RBAC for roles: Progress, Inspection, QA (ORDAQA), Stores, Customer, Shop Manager

## Schema entities

`WorkflowDefinition`, `WorkflowInstance`, `WorkflowNode`, `WorkflowTransition`, users/roles, `InspectionRecords`, `Documents`, `AuditLogs`.

## Confidentiality

All UI and exports: **Property of HAL**. Attachments behind auth. Immutable audit for Pass/Fail/Reject/Approve.

## Repo layout (operator-facing)

```text
.env.example          # top-level env template (copy → .env)
AGENTS.md
README.md
docs/
ui/                   # React SPA (Vite)
server/               # Spring Boot + jOOQ + Flyway
config/               # profile overlays + UI VITE templates
docker/               # compose + Dockerfiles only
scripts/              # start / stop / health / verify / seed
```
