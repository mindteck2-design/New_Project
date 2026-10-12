# AMMS navigation IA

## Principle

Administrators **configure** how maintenance is performed (forms + workflows).  
Shop personnel **execute** configured work packages and stage forms.  
Everyone **tracks** progress, approvals, and aircraft maintenance history.

Routes stay stable (`AGENTS.md`). Labels speak aircraft-maintenance language — not engine jargon.

## Menu structure

| Group | Label | Route | Business purpose |
|-------|-------|-------|------------------|
| Overview | Dashboard | `/` | Role briefing + pending stages |
| Overview | Analytics | `/analytics` | Role KPIs |
| Execute | Pending actions | `/inbox` | Stages waiting on the signed-in role |
| Execute | Work packages | `/packages` | Aircraft PO/SO maintenance jobs (primary shop entry) |
| Track | Maintenance runs | `/instances` | Active/completed stage executions + history |
| Configure | Form Master | `/forms` | Reusable checklists / stage forms |
| Configure | Workflow Master | `/workflows` | Configurable stage sequence, roles, transitions |

Source of truth for labels/groups: `ui/src/lib/navConfig.js`.

## What happened to “Instance” and “Process map”?

| Former label | Decision | Why |
|--------------|----------|-----|
| **Instances** | **Renamed** → Maintenance runs | Still the runtime engine (`/instances/:id`). “Instance” is developer jargon; personnel track *maintenance runs*. |
| **Process map** | **Removed from sidebar** | Duplicated Workflow Master detail chart. Legacy `/process` and `/process/:key` **redirect** to `/workflows` / `/workflows/:key`. |
| **Workflows** | **Renamed** → Workflow Master | Configuration module, not shop start screen. |
| **Master forms** | **Renamed** → Form Master | Parity with Workflow Master. |
| **Action inbox** | **Renamed** → Pending actions | Clearer for maintenance roles. |

## Execution path (retain)

1. **Form Master** — publish reusable forms.
2. **Workflow Master** — stages + role + form + transitions (visual builder).
3. **Work package** — aircraft + PO/SO + ROUTINE|REPAIR + chosen workflow.
4. **Open part** → starts a **maintenance run** (`/instances/:id`).
5. Role completes form / decision → server advances → audit trail.

Ad-hoc **Test run** on Workflow Master remains for validating a chart; shop work should start from Work packages.

## Gaps (tracked, not invented in this pass)

- Formal “Work order” entity beyond work package + part (future alias or table).
- Full Workflow Master features: clone/activate/version publish UI, skip rules, escalation (engine supports transitions; UI coverage incomplete).
- Aircraft-type applicability filters on workflow definitions.
