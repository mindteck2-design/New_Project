# Aircraft work packages — PO/SO testing flow

## Intent

Keep **workflows as master templates**. Real shop execution is a **work package** tied to an aircraft **PO/SO**, with testing type **ROUTINE** or **REPAIR**. Operators open **parts one by one**, run the mapped master workflow (disassemble → test → reassemble → report), and the app consolidates a **test report**.

This sits above the existing engine (definitions / instances / Mongo forms / audit). It does **not** replace DecisionEngine or invent chart steps outside approved workflow JSON.

## Layers

| Layer | What it is | Who owns it |
|-------|------------|-------------|
| Master forms | Reusable Mongo schemas | Admin |
| Master workflows | Charts (nodes + role + formKey) | Admin |
| Work package | PO/SO + aircraft + testing type + chosen master workflow | Progress / planning |
| Part line | One serialised / tracked part on the package | Progress / Inspection |
| Workflow instance | Runtime execution for **one part** | Role-gated shop users |
| Test report | Roll-up of part results + attachments | QA / Inspection / Customer view |

## Testing types

| Type | When | Master workflow (examples) |
|------|------|----------------------------|
| `ROUTINE` | Scheduled / periodic aircraft or accessory check | `aircraft-routine-test` (or Accessories/NDT masters) |
| `REPAIR` | Finding / unscheduled / repair-driven retest | `aircraft-repair-test` (or FAIL→repair chart) |

Selecting the type on the package picks the **default master workflow**. Advanced: override with another active definition of the same type tag.

## Operator journey

1. **Admin** builds master forms + master workflows (already in app).
2. **Progress** creates **Work package**: aircraft id, PO#, SO#, testing type ROUTINE|REPAIR, master workflow.
3. **Progress** adds **parts** (part no, serial, sequence, description).
4. For each part, user **Open part** → system starts a **workflow instance** with:
   - `businessKey` = `{PO}-{partNo}-{serial}`
   - context: `{ workPackageId, partId, poNumber, soNumber, testingType, aircraftId }`
5. Instance steps (from master chart) typically:
   - Disassemble / open access
   - Test (dynamic form + decision PASS/FAIL)
   - Reassemble
   - Report / endorse
6. Attachments + form submissions become the **part test record**.
7. When all parts COMPLETED (or failed with disposition), package status → COMPLETED and **package test report** is available (Excel/PDF later; MVP = consolidated table + exports).

## Data model (Postgres)

```text
work_packages
  id, package_no, aircraft_id, po_number, so_number,
  testing_type (ROUTINE|REPAIR), workflow_definition_id,
  status (DRAFT|READY|IN_PROGRESS|COMPLETED|CANCELLED),
  notes, created_by, created_at, updated_at

work_package_parts
  id, package_id, sequence_no, part_no, serial_no, description,
  status (PENDING|IN_TEST|REASSEMBLED|PASSED|FAILED|SKIPPED),
  instance_id NULL, opened_at, closed_at

-- test report is derived from instance audit + form_submissions + inspection_records
-- optional cache:
work_package_reports
  id, package_id, generated_at, summary_json, generated_by
```

Tag master workflows in `definition_json` or a column later:

```json
{ "key": "aircraft-routine-test", "workType": "ROUTINE", ... }
```

## UI routes (proposed)

| Route | Purpose |
|-------|---------|
| `/packages` | List work packages (filter by PO/SO, type, status) |
| `/packages/new` | Create package: PO/SO, aircraft, ROUTINE\|REPAIR, master workflow |
| `/packages/:id` | Parts board — open part, status, link to instance |
| `/packages/:id/report` | Consolidated test report |
| Existing `/instances/:id` | Stage execution (forms, decisions, attachments) |

## RBAC

| Role | Package actions |
|------|-----------------|
| PROGRESS | Create package, add parts, open part (start instance) |
| INSPECTION | Run test steps, decisions, part reports |
| SHOP_MANAGER | Repair path steps when chart assigns them |
| QA | View completed packages / endorse report |
| CUSTOMER | Read-only completed report by PO/SO |
| STORES | Future: part quarantine / RR (out of this slice) |

## Why this fits the current engine

- **UI never picks next node** — still server-driven per part instance.
- **Master forms** stay reusable across ROUTINE and REPAIR charts.
- **One instance per part** keeps audit/form/attachment trails clean.
- **PO/SO** live on the package, not hard-coded into workflow JSON.
- Aircraft A-1/A-2 charts from inventory can become additional master workflows later without changing the package model.

## Implementation phases

| Slice | Deliverable |
|-------|-------------|
| **A (next)** | Flyway tables + API + Packages UI (create, parts, open → start instance) |
| **B** | Package report page (aggregate PASS/FAIL + form payloads + docs) |
| **C** | Seed ROUTINE / REPAIR master workflow stubs + workType filter in builder |
| **D** | Excel/PDF package report, IFS PO/SO lookup (integration) |

## Non-goals (this design)

- Full IFS/AMMS sync of PO/SO lines
- Automatic BOM explosion from aircraft config
- Camunda / heavy BPMN
- Inventing HAL chart steps not in `docs/workflows/`
