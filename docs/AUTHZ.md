# Authentication & Authorization

## Auth (MVP)

- JWT bearer tokens issued by `POST /api/v1/auth/login`
- Password hashing: BCrypt
- Seeded users (dev/local) — see `config/.env.example` / seed runner

## Roles

| Code | Label |
|------|-------|
| `ADMIN` | System Administrator — user administration only unless operational roles are explicitly assigned |
| `PROGRESS` | Progress Department |
| `INSPECTION` | Inspection |
| `QA` | QA / ORDAQA / QA-AGENCY |
| `STORES` | Stores |
| `CUSTOMER` | Customer |
| `SHOP_MANAGER` | Shop Manager |

## Enforcement

1. Spring Security authenticates JWT against the current database account; inactive/missing accounts are rejected even when a previously issued token remains unexpired
2. **Start instance** requires the workflow `START` node `roleCode` (e.g. Accessories → `PROGRESS`, NDT RT → `INSPECTION`)
3. `WorkflowService` checks `currentNode.roleCode` ⊆ user roles before allowing transitions/form submit
4. List/get endpoints allow view when user: started the instance, previously participated, holds the current-step role, **or** (for `COMPLETED` instances) holds `QA` / `CUSTOMER` (acceptance visibility)
5. `/api/v1/users/**` is restricted server-side to `ADMIN`; the UI hides the route for other roles but is not an authorization boundary
6. Newly created/reset accounts must change their temporary password before accessing other API routes

Usernames are immutable. User administration retains accounts and writes safe before/after audit records; hard deletion is not supported. The seeded development `admin` account retains its existing operational roles for test compatibility. A production bootstrap account receives only `ADMIN`; maintenance roles must be assigned deliberately.

## Step visibility matrix (seed)

| Workflow node (examples) | Allowed roles |
|--------------------------|---------------|
| Spares demand/supply | `PROGRESS` |
| Bench test / NDT test | `INSPECTION` |
| Repair / rework | `SHOP_MANAGER` |
| QA stage memo / clearances | `QA` |
| RR quarantine / holding | `STORES` |
| Acceptance visibility | `CUSTOMER`, `QA` |

## Digital signature placeholder

On transition: optional `signaturePlaceholder` string stored on `audit_logs` with `user_id` + `created_at`. Not cryptographic PKI.
