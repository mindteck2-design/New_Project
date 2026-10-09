# API Contracts

Base path: `/api/v1`  
Auth: `Authorization: Bearer <jwt>`  
Errors: `{ "code": string, "message": string, "details": object|null }`

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{ username, password }` | `{ token, user: { id, username, displayName, roles[] } }` |
| GET | `/auth/me` | — | current user |

## Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workflows` | List active definitions `{ id, key, name, version }` |
| POST | `/workflows` | Create definition `{ key, name, nodes[{key,type,label,roleCode,formKey?}], transitions[] }` |
| GET | `/workflows/{key}` | Definition detail (live nodes incl. `formKey`, transitions) |
| PUT | `/workflows/{key}/nodes/{nodeKey}/form` | Attach Mongo form to TASK node `{ formKey }` |
| POST | `/workflows/{key}/instances` | Start instance `{ businessKey?, context? }` → instance |
| GET | `/roles` | Role codes for workflow builder |
| GET | `/instances` | List instances (filter by status/role-relevant) |
| GET | `/instances/{id}` | Instance + `currentNode` + `allowedActions` |
| POST | `/instances/{id}/transitions` | `{ action, decisionValue?, formPayload?, notes?, signaturePlaceholder? }` |
| POST | `/instances/{id}/forms` | Submit form for current node `{ formKey, payload }` |
| GET | `/instances/{id}/audit` | Audit trail |
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
- `DECISION` → `DecisionNode` buttons from `allowedActions`
- `END` → completion summary

Never compute next node client-side.
