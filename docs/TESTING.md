# Testing Strategy

## Layers

| Layer | Focus | Location |
|-------|-------|----------|
| Unit | `DecisionEngine` condition evaluation; transition selection | `DecisionEngineTest` |
| API / role E2E | Full role handoffs for both seeded workflows; 403 matrix; audit; notifications | `RoleMatrixE2ETest`, `WorkflowApiIntegrationTest` |
| UI build | Production Vite build | `ui` `npm run build` via `scripts/verify.sh` |

## Role matrix E2E (must-pass)

Run with PostgreSQL available (local `amms` DB):

```bash
cd server && ./mvnw -q test -Dtest=RoleMatrixE2ETest
# or full suite:
./scripts/verify.sh
```

| Scenario | Actors | Assert |
|----------|--------|--------|
| Accessories start authz | Only `progress.user` | Others 403 |
| NDT start authz | Only `inspection.user` | Others 403 |
| Accessories PASS → complete | Progress → Inspection | COMPLETED `complete_serviceable`; QA/Customer can view |
| Accessories FAIL → repair | Progress → Inspection → Shop → Inspection | COMPLETED `return_fail` |
| Accessories BER YES | Progress → Inspection | COMPLETED `condemn` |
| Accessories rotable path | Progress ↔ Inspection | COMPLETED after SST |
| NDT accept / reject | Inspection | `dispatch` / `reject` |
| Isolation | Stores/Customer/QA | 403 on wrong steps; empty `allowedActions` |
| Notifications | Inspection after Progress handoff | Inbox contains instance |

Seeded password: `Passw0rd!` (`amms.seed.password`).

## Manual UI smoke

1. Login as `progress.user` → `/workflows` → start Accessories
2. Switch to `inspection.user` → `/inbox` → complete Pass/Fail
3. On FAIL path switch to `shop.user` for repair
4. Login as `inspection.user` → start NDT → accept/reject
5. Confirm breadcrumbs + routes (`/inbox`, `/instances/:id`) and Property of HAL footer
