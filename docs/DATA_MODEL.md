# Data Model & Migrations

## Strategy

- **PostgreSQL** schema via **Flyway** (`server/src/main/resources/db/migration/V*.sql`)
- **Access layer:** **jOOQ** (`DSLContext` + table/field definitions / DAOs). No JPA/Hibernate.
- **MongoDB** (required for dynamic forms — ADR-002): `form_schemas` + `form_submissions` when `amms.forms.store=mongo` (default)
- Never edit applied migrations; add a new version

## Core tables (PostgreSQL)

### users / roles

```sql
users(id UUID PK, username UNIQUE, password_hash, display_name, active, must_change_password, created_at)
roles(id UUID PK, code UNIQUE, name)
user_roles(user_id, role_id)
```

`must_change_password` defaults to `FALSE` for existing rows. Managed accounts are deactivated, not deleted.

### User administration audit

```sql
user_admin_audit_logs(
  id UUID PK,
  actor_user_id UUID NULL FK users,
  target_user_id UUID NOT NULL FK users,
  action VARCHAR(50),
  changes_json JSONB,
  created_at TIMESTAMPTZ
)
```

`actor_user_id` is null only for the operator-controlled initial production bootstrap. Audit payloads contain safe account/role/status deltas and never contain passwords, reset secrets, or tokens. User administration writes and audit rows share one transaction.

### workflow definitions

```sql
workflow_definitions(id UUID PK, key UNIQUE, name, version INT, active BOOL, definition_json JSONB, created_at)
workflow_nodes(id UUID PK, definition_id FK, node_key, node_type, role_code, form_key, label, config_json JSONB)
workflow_transitions(id UUID PK, definition_id FK, from_node_key, to_node_key, condition_value, priority INT)
```

`node_type`: `START` | `TASK` | `DECISION` | `END`

### instances & records

```sql
workflow_instances(id UUID PK, definition_id FK, business_key, status, current_node_key, context_json JSONB, started_by, started_at, updated_at)
inspection_records(id UUID PK, instance_id FK, node_key, result, notes, recorded_by, recorded_at)
documents(id UUID PK, instance_id FK, node_key, file_name, content_type, storage_key, uploaded_by, uploaded_at)
audit_logs(id UUID PK, instance_id, user_id, action, from_node, to_node, payload_json JSONB, signature_placeholder, created_at)
```

`workflow_instances.status`: `RUNNING` | `COMPLETED` | `CANCELLED`

### form fallback (Postgres JSONB — `amms.forms.store=postgres` only)

```sql
form_documents(id UUID PK, instance_id, form_key, node_key, payload_json JSONB, created_by, created_at)
```

## MongoDB (default forms store)

| Collection | Purpose |
|------------|---------|
| `form_schemas` | `{ formKey, name, fields[] }` served by `GET /api/v1/forms/{formKey}` |
| `form_submissions` | `{ instanceId, formKey, nodeKey, payloadJson, createdBy, createdAt }` |

## Migration rules

1. `V1__init.sql` — base tables + operational roles
2. `V5__user_management_foundation.sql` — `ADMIN`, forced-password-change flag, and user-administration audit table/indexes
3. Later versions for additive schema changes only; never edit an applied migration
4. Workflow and demo-user seed data is confined to non-production profiles
