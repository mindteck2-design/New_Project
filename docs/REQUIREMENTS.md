# Requirements & Scope

## Goal

Digitize HAL Overhaul Division maintenance procedures as a **Dynamic Workflow Engine** compliant with AS 9110 C–aligned practices and strict RBAC.

## Actors / roles

| Role | Typical actions |
|------|-----------------|
| `PROGRESS` | Spares demand/supply, rotable handoff, receive returns with documents |
| `INSPECTION` | Bench/test, dimensional/NDT checks, memos, Pass/Fail |
| `QA` (ORDAQA / QA-AGENCY) | Stage memos, flight safety certificates, clearances |
| `STORES` | RR clearance, quarantine, holding, SLE monitoring |
| `CUSTOMER` | Acceptance / ferry visibility (limited) |
| `SHOP_MANAGER` | Repair/rework execution on shop floor |

## In scope (MVP)

1. DB-driven workflow definitions (nodes, decisions, transitions)
2. Workflow instances with current-step execution
3. Decision nodes (Pass/Fail, Yes/No) evaluated server-side
4. Dynamic forms per step (Mongo or local JSONB fallback)
5. Attachment metadata + MinIO (or local filesystem fallback)
6. Immutable audit log (user, timestamp, action, digital-signature placeholder)
7. Seed workflows:
   - Accessories Bench Check / Repair
   - NDT Radiography
8. JWT auth with seeded users per role
9. Monorepo ops: `ui/`, `server/`, `config/`, `docker/`, `scripts/`
10. Admin-managed user lifecycle: create, search, update display name, assign supported roles, activate/deactivate, and reset temporary passwords
11. Temporary passwords require change before protected API access; inactive accounts cannot use existing JWTs
12. User administration changes are transactionally audited; accounts are retained rather than deleted

## Out of scope (MVP)

- Full A-2 / A-3 / A-4 aircraft graphs (documented only)
- Stores RR matrix, plating chemistry, metrology calibration runtime
- Live IFS / AMMS / MUMS integrations
- PKI digital signatures / SSO
- Email invitations or email-based password recovery (no delivery service is configured)
- Heavy BPMN engines (Camunda/Flowable)

## Functional requirements

- FR1: Admins (or seed) configure workflows without code deploy
- FR2: Users see only steps/forms allowed for their role on the current node
- FR3: UI never computes next node; server returns `currentNode` + actions
- FR4: Every Pass/Fail/Reject/Approve writes an audit row
- FR5: Administrators can search, create, update, activate/deactivate, and assign supported roles to user accounts
- FR6: Temporary passwords require a change before other protected API access; users can change their own password
- FR7: Deactivated accounts are rejected even when presenting an unexpired JWT
- FR8: User-administration mutations and password changes are audited without password or token contents
- FR9: The system prevents deactivation or demotion of the last active administrator
## Non-functional

- Profiles: `dev`, `prod`, `local` (no-Docker fallbacks)
- Incremental Flyway migrations
- Testable DecisionEngine and transition legality

## Assumptions

- Summaries in source uploads are authoritative for seed graphs
- “FIRM” / “QA-AGENCY” are configurable labels
- Digital signature MVP = userId + timestamp + optional placeholder string

## Unresolved / NEEDS_REVIEW

- Accessories Overhaul branch text “PASS → Beyond Repair” appears inverted; flagged in workflow inventory
- Exact ORDAQA vs QA-AGENCY role mapping pending org confirmation
