# Implementation phases — status

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | `AGENTS.md`, `docs/*`, workflow JSON inventory | **Complete** |
| 1 | Monorepo layout (`ui`, `server`, `config`, `docker`, `scripts`) | **Complete** |
| 2 | Platform skeleton: Spring Boot + jOOQ + Flyway, Vite UI, Compose, scripts | **Complete** |
| 3 | Workflow engine: definitions, instances, `DecisionEngine`, unit tests | **Complete** |
| 4 | Accessories Bench Check vertical slice (API + UI + audit) | **Complete** |
| 5 | NDT Radiography second workflow | **Complete** |
| 6 | Hardening: RBAC on instances/docs, attachment ACL download, integration tests, verify script | **Complete** |

## Phase 6 deliverables

- `AttachmentStorageService` — path-safe local storage (MinIO in Compose; disk on `local`)
- `GET /api/v1/instances/{id}/documents/{docId}/content` — authenticated download
- Instance list/get filtered by role / participation / starter
- `WorkflowApiIntegrationTest` — 403 wrong role, FAIL→repair, 400 missing decision
- `scripts/verify.sh` — server tests, UI build, optional healthcheck
- Modern UI: shadcn theme, XYFlow charts, role switcher, actionable notifications

## Deferred (post-MVP)

- Full aircraft A-2/A-3/A-4 runtime workflows (inventory in `docs/workflows/INVENTORY.md`)
- Mongo form store (`AMMS_FORMS_STORE=mongo` when Mongo available)
- PKI digital signatures, SSO, IFS/AMMS integrations
- Stores / plating / metrology chart imports

## Verify locally

```bash
./scripts/verify.sh
./scripts/healthcheck.sh   # when stack is running
```
