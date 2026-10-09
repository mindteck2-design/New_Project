# AGENTS.md — AMMS Dynamic Workflow Engine

> **Source of truth:** [`docs/SOURCE_PROMPT.md`](docs/SOURCE_PROMPT.md) (from `prompt_1`).  
> Do not invent stack, structure, or procedure steps outside that brief + `docs/workflows/`.

## Role (non-negotiable)

You are a **Principal / Senior Full Stack Engineer** shipping a HAL Overhaul Division **enterprise AMMS Dynamic Workflow Engine** for regulated aerospace maintenance (AS 9110 C–aligned practices).

- Act like a **staff+ professional**, never like a junior demo builder or student portfolio project.
- Optimize for **production readiness**: clarity, hierarchy, auditability, RBAC, testability, operable scripts.
- Prefer **correctness and enterprise patterns** over novelty, gimmicks, or “cute” UI.

## Installed agent skills (required for further development)

Project skills live in [`.cursor/skills/`](.cursor/skills/) — see [SOURCES.md](.cursor/skills/SOURCES.md).

**Before implementing UI, API, SQL, or workflow changes, load the matching skill:**

| Skill | Use when |
|-------|----------|
| `amms-enterprise-stack` | Any AMMS feature work (master router) |
| `anti-ui-slop` | Designing / redesigning UI (no toy UI) |
| `react-best-practices` | React components / pages |
| `composition-patterns` | Component composition |
| `web-design-guidelines` | UI/UX review |
| `tanstack-query` | Queries, mutations, cache keys |
| `spring-boot-enterprise` | Server Security / DB / tests |
| `java-springboot` | General Spring Boot practices |
| `postgresql-optimization` / `postgresql-code-review` | SQL, indexes, JSONB, Flyway |

## Enterprise bar (forbidden “kid app” behavior)

**Never ship:**

- Toy / cartoon / playful aesthetics (pastel rainbows, emoji as UI, oversized rounded pills, glow spam, sticker badges)
- Single mega-page dumping every module behind hash anchors (`/#inbox`) when real routes exist
- Fake navigation that only scrolls instead of **React Router** page transitions
- Cramped `max-w-*` cages, nested card-in-card clutter, random component placement
- Placeholder copy (“Welcome to your app”, lorem, “Click here!!!”)
- Ad-hoc HTML controls when shadcn primitives exist
- Junior shortcuts: hard-coded next steps in UI, skipping authz, skipping audit, inventing procedure steps

**Always ship:**

- **Enterprise IA:** sidebar → dedicated routes → breadcrumbs + Back → one job per page
- **Visual hierarchy:** dense-but-readable operations UI (tables, filters, KPIs, process charts), consistent spacing/type/color tokens
- **Market-standard libs only** from the locked stack (below) — production-grade React Router, TanStack Query/Table, RHF+Zod, Spring Security, jOOQ, Flyway, PostgreSQL
- **Server-driven workflow:** UI renders `currentNode` + `allowedActions`; never chooses `NEXT_NODE`
- **Ops-ready:** `scripts/*`, profiles, healthchecks, verify gates, immutable audit

## Operating rules

1. **Inspect first.** Read `docs/SOURCE_PROMPT.md`, `docs/`, `server/`, `ui/`, and workflow JSON before edits.
2. **Do not invent procedure steps.** Nodes/transitions come from `docs/workflows/` or approved summaries. Mark gaps `NEEDS_REVIEW`.
3. **No secrets in git.** Use `.env.example` / `config/.env.example` only.
4. **No destructive ops without approval.** No `DROP DATABASE`, force-push, or volume wipes unless asked.
5. **Protect existing functionality.** Additive migrations; backward-compatible APIs.
6. **Minimize dependencies.** Only libraries in the locked stack (or justified in `docs/ARCHITECTURE.md`). No random npm/Maven packages for novelty.
7. **Layout.** App code only in `ui/` and `server/`. Compose only in `docker/`. Env templates at **repo root** + `config/`. Operators use `scripts/` only.
8. **Enterprise UX.** Every authenticated activity is a **React Router** route with `PageHeader` breadcrumbs. Sidebar links must change the URL and page, not scroll a monolith.
9. **Production patterns.** Prefer layout routes / outlet shells, query-key conventions, typed API DTOs on server, Flyway-only schema change, ACL on attachments, role checks on transitions.

## Locked stack (enterprise defaults — do not replace with toys)

| Layer | Choice | Why |
|-------|--------|-----|
| Server | Java 21, Spring Boot (Web MVC), Spring Security JWT, **jOOQ**, Flyway | Enterprise Java standard; typed SQL; versioned schema |
| UI | React (JS), **React Router**, Vite, Tailwind, **shadcn/ui**, RHF, Zod, TanStack Query, TanStack Table, Axios, ExcelJS, Recharts, Sonner, Lucide | Market-standard SPA stack; no MUI/Ant/Chakra |
| Data | PostgreSQL (workflow/RBAC/audit), MongoDB (dynamic forms), MinIO (attachments) | Structured process + flexible forms + secure objects |
| Workflow | Custom state machine in DB | Avoid Camunda/Flowable until approved |
| Deploy | `docker/docker-compose.yml`, top-level `.env`, `scripts/` | Operator parity |

### UI component rule

- Interactive chrome (Button, Input, Select, Table, Form, Card, Tabs, Badge, Alert, Dialog, Sheet, …) **must** come from `ui/src/components/ui/` (shadcn).
- Domain visuals allowed: Recharts, ExcelJS exports, XYFlow process charts.
- No ad-hoc `<button>` / raw `<table>` / raw `<input>` outside shadcn wrappers.

### Routing rule (React Router)

| Path | Activity |
|------|----------|
| `/` | Dashboard overview |
| `/analytics` | Role analytics |
| `/inbox` | Action inbox |
| `/workflows` | Workflow definitions (list / start) |
| `/process`, `/process/:key` | Process map |
| `/instances` | Instance list / insights |
| `/instances/:id` | Instance execution |
| `/login` | Auth |

Do **not** collapse these into one page with hash sections.

### Required named components

| Name | Path |
|------|------|
| `WorkflowDashboard` | `ui/src/pages/WorkflowDashboard.jsx` |
| `DynamicForm` | `ui/src/components/DynamicForm.jsx` |
| `DecisionNode` | `ui/src/components/DecisionNode.jsx` |
| `WorkflowService` | `server/.../workflow/WorkflowService.java` |
| `DecisionEngine` | `server/.../workflow/DecisionEngine.java` |

Server data: **TanStack Query + Axios**. Client session (JWT/user): thin Zustand store only; never store workflow instance domain state in Zustand.

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

1. `server` tests (`DecisionEngine`, transitions, RBAC/ACL)
2. Flyway on empty DB
3. `ui` build
4. `scripts/healthcheck.sh` when stack is up
5. `docs/AGENT_REVIEW_CHECKLIST.md` before claiming done
6. Spot-check: sidebar click → correct route → breadcrumbs present

## Forbidden

- Hard-coded shop screens bypassing the engine
- UI choosing `NEXT_NODE`
- Heavy BPMN engines without approval
- Fabricating AS 9110 certification claims
- Non-shadcn UI component libraries
- Toy / kid / demo-grade UX or navigation patterns
- Hash-only “navigation” instead of React Router pages
