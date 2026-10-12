# AMMS navigation IA

## Principle

Administrators **configure** how maintenance is performed (forms + workflows).  
Shop personnel **execute** configured work orders and stage forms.  
Everyone **tracks** progress, approvals, and aircraft maintenance history.

Routes stay stable (`AGENTS.md`). Labels speak aircraft-maintenance language — not engine jargon.

## Menu structure

| Group | Label | Route | Business purpose |
|-------|-------|-------|------------------|
| Overview | Dashboard | `/` | Role briefing + pending stages |
| Overview | Analytics | `/analytics` | Role KPIs |
| Execute | Pending actions | `/inbox` | Stages waiting on the signed-in role |
| Execute | Work orders | `/packages` | Aircraft PO/SO maintenance jobs (API remains `/packages`) |
| Track | Maintenance runs | `/instances` | Active/completed stage executions + history |
| Configure | Form Master | `/forms` | Reusable checklists / stage forms (draft → publish) |
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
| **Work packages** | **Renamed** → Work orders | Shop-facing label; REST path `/api/v1/packages` unchanged. |

## Execution path (retain)

1. **Form Master** — draft → publish reusable forms (clone preserves a new draft key).
2. **Workflow Master** — stages + role + form + transitions; filter by work type / aircraft; activate or clone charts.
3. **Work order** — aircraft + PO/SO + ROUTINE|REPAIR (optional default workflow).
4. **Add part** — attach a master workflow to that aircraft part (not the whole work order).
5. **Open part** → starts a **maintenance run** (`/instances/:id`) for the part’s chart.
5. Role completes form / decision → server advances → audit trail.

Ad-hoc **Test run** on Workflow Master remains for validating a chart; shop work should start from Work orders.

## Workflow Master APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/workflows?includeInactive&workType&aircraftType` | List with filters |
| POST | `/api/v1/workflows/{key}/clone` | Clone chart under new key |
| PUT | `/api/v1/workflows/{key}/active` | Activate / deactivate |

Meta (`workType`, `aircraftTypes`, `description`) lives in `definition_json`.

## Form Master APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/forms?status=` | List DRAFT / PUBLISHED |
| POST | `/api/v1/forms/{key}/publish` | Publish draft |
| POST | `/api/v1/forms/{key}/draft` | Unpublish to draft |
| POST | `/api/v1/forms/{key}/clone` | Clone as new DRAFT v1 |

Editing a published form bumps `version`. Seeded catalog forms are PUBLISHED.

**Table field type:** designers add/remove columns and pick each column’s cell input type (`columns: [{ key, label, type, options?, placeholder? }]` — types: text, textarea, number, measurement, email, phone, url, date, time, datetime, select, radio, checkbox). Operators add/remove rows; each cell renders the column’s control. Payload is an array of row objects keyed by column (`string` or `boolean` for checkbox).

## Gaps (tracked — out of this pass)

- Formal separate Work-order table (current UI alias on `/packages` is sufficient).
- Skip rules / escalation UI (engine transitions already support conditions).
- Broader production gaps: see `docs/PRODUCTION_GAPS.md` (P7–P12).
