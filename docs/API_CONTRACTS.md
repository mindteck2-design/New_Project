# API Contracts

Base path: `/api/v1`  
Auth: `Authorization: Bearer <jwt>`  
Errors: `{ "code": string, "message": string, "details": object|null }`

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{ username, password }` | `{ token, user: { id, username, displayName, roles[] } }` |
| GET | `/auth/me` | — | current user `{ id, username, displayName, roles[], mustChangePassword }` |
| POST | `/auth/password` | `{ currentPassword, newPassword }` | current user; clears forced-change state |

## User administration

All `/users` endpoints require the `ADMIN` role. User records never include password hashes or submitted passwords. Usernames are immutable after creation; accounts are deactivated rather than deleted.

| Method | Path | Body / query | Description |
|--------|------|--------------|-------------|
| GET | `/users?page=0&size=25&active=true&role=PROGRESS&q=...` | — | Paginated user search; filters are optional, `size` is 1–100 |
| GET | `/users/{id}` | — | Read one managed user |
| POST | `/users` | `{ username, displayName, roles[], temporaryPassword }` | Create active account; temporary password must be changed at first sign-in |
| PATCH | `/users/{id}` | `{ displayName, roles[], active }` | Update display name, supported role assignments, and active state |
| POST | `/users/{id}/password-reset` | `{ temporaryPassword }` | Set a temporary password; next sign-in requires a password change |

The password-change gate permits only `GET /auth/me` and `POST /auth/password` until the temporary password is changed. Passwords must be at least 12 characters and no more than 72 UTF-8 bytes. A request that would demote or deactivate the last administrator returns `409`. Management operations and their safe before/after state are written atomically to `user_admin_audit_logs`; credentials are never included in audit payloads.

In the `prod` profile, the first administrator is bootstrapped only when both `AMMS_ADMIN_BOOTSTRAP_USERNAME` and `AMMS_ADMIN_BOOTSTRAP_PASSWORD` are supplied. The bootstrap account receives only `ADMIN` and must change its temporary password. Remove both variables before restarting after successful bootstrap; if an administrator already exists while bootstrap credentials remain configured, startup fails closed.

## Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workflows` | List active definitions `{ id, key, name, version }` |
| POST | `/workflows` | Create definition `{ key, name, nodes[{key,type,label,roleCode,formKey}], transitions[] }`; `formKey` is required for TASK and DECISION nodes |
| GET | `/workflows/{key}` | Definition detail (live nodes incl. `formKey`, transitions) |
| PUT | `/workflows/{key}/nodes/{nodeKey}/form` | Attach Mongo form to TASK or DECISION node `{ formKey }` |
| POST | `/workflows/{key}/instances` | Start instance `{ businessKey?, context? }` → instance |
| GET | `/roles` | Role codes for workflow builder |
| GET | `/instances` | List instances (filter by status/role-relevant) |
| GET | `/instances/{id}` | Instance + `currentNode` + `allowedActions` |
| POST | `/instances/{id}/transitions` | `{ action, decisionValue?, formPayload?, notes?, signaturePlaceholder? }`; immutable audit event captures the node/form identity, submitted values, and decision outcome |
| POST | `/instances/{id}/forms` | Submit form for current node `{ formKey, payload }` |
| GET | `/instances/{id}/forms/current` | Latest submitted values for the authorized instance's current node and its assigned form (empty values when no matching attempt exists) |
| GET | `/instances/{id}/audit` | Audit trail including actor display name/username and immutable form snapshots with field metadata, workflow version, and decision outcome when available |
| POST | `/instances/{id}/documents` | multipart upload |
| GET | `/instances/{id}/documents` | List attachments |
| GET | `/instances/{instanceId}/documents/{documentId}/content` | Authenticated attachment download |

## Dynamic forms (MongoDB `form_schemas`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/forms` | List schemas `{ formKey, name, fields[], store }` |
| GET | `/forms/{formKey}` | Get one schema |
| POST | `/forms` | Create `{ formKey, name, fields[{ name, label, type?, placeholder?, required? }] }` |
| PUT | `/forms/{formKey}` | Update name/fields |
| DELETE | `/forms/{formKey}` | Delete schema |

## Transition response shape

Form values and field metadata are stored with each transition audit event as a snapshot; later attempts do not replace earlier values. Authorized viewers can open a read-only full-form view from each audit event. Actor identity is returned as display name and username; the user ID remains available for compatibility. If a FAIL route returns to a prior node, the current-form endpoint supplies the latest submission matching that same instance, node, and form so the operator can continue editing it. Fields no longer present in the current schema are ignored by the client.

```json
{
  "instanceId": "uuid",
  "status": "RUNNING",
  "currentNode": {
    "key": "result",
    "type": "DECISION",
    "label": "Pass / Fail",
    "roleCode": "INSPECTION",
    "formKey": null
  },
  "allowedActions": [
    { "type": "DECISION", "value": "PASS", "label": "Pass" },
    { "type": "DECISION", "value": "FAIL", "label": "Fail" }
  ],
  "context": {}
}
```

## Dynamic routing rule

UI stores `instanceId`, calls `GET /instances/{id}`, and renders:

- `TASK` → `DynamicForm` (+ complete action)
- `DECISION` → `DynamicForm` plus outcome choices from `allowedActions`; form payload and decision are submitted together
- `END` → completion summary

Never compute next node client-side.

Workflow definitions declare conditional destinations on transitions. Each configured `DECISION` outcome must have exactly one `when` transition; the destination may be any workflow node, including an earlier step or an `END` node. The server validates node references and confirms that all nodes are reachable from `START` and have a path to `END`. Backward routes are supported, but a loop may continue indefinitely if operators repeatedly choose the looping outcome.
