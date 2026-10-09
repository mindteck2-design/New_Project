# Data Model & Migrations

## Strategy

- **PostgreSQL** schema via **Flyway** (`server/src/main/resources/db/migration/V*.sql`)
- **Access layer:** **jOOQ** (`DSLContext` + table/field definitions / DAOs). No JPA/Hibernate.
- **MongoDB** (required for dynamic forms — ADR-002): `form_schemas` + `form_submissions` when `amms.forms.store=mongo` (default)
- Never edit applied migrations; add a new version

## Core tables (PostgreSQL)

### users / roles

```sql
users(id UUID PK, username UNIQUE, password_hash, display_name, active, created_at)
roles(id UUID PK, code UNIQUE, name)
user_roles(user_id, role_id)
```

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

1. `V1__init.sql` — base tables + seed roles
2. Later versions for indexes/constraints only as needed
3. Workflow seed data loaded via `scripts/seed.sh` / application runner (not hardcoded business logic in Java beyond bootstrap)
