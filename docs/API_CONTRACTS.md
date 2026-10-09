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
| GET | `/workflows/{key}` | Definition detail (nodes/transitions summary) |
| POST | `/workflows/{key}/instances` | Start instance `{ businessKey?, context? }` → instance |
| GET | `/instances` | List instances (filter by status/role-relevant) |
| GET | `/instances/{id}` | Instance + `currentNode` + `allowedActions` |
| POST | `/instances/{id}/transitions` | `{ action, decisionValue?, formPayload?, notes?, signaturePlaceholder? }` |
| POST | `/instances/{id}/forms` | Submit form for current node `{ formKey, payload }` |
| GET | `/instances/{id}/audit` | Audit trail |
| POST | `/instances/{id}/documents` | multipart upload |
| GET | `/instances/{id}/documents` | List attachments |

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
