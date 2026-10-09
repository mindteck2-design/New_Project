# Security Practices (AS 9110 C–aligned)

These practices support quality-management expectations; they do **not** claim formal certification.

## Principles

1. **Least privilege** — RBAC on every mutating workflow API
2. **Traceability** — immutable audit log for Pass/Fail/Reject/Approve/transition
3. **Confidentiality** — UI footer/banner: “Property of HAL — Restricted”
4. **Integrity** — server-side decision evaluation; clients cannot pick next node
5. **Attachment ACL** — documents scoped to instance; download requires authz
6. **Safe logging** — no passwords, tokens, or full form PII dumps

## Controls

| Control | Implementation |
|---------|----------------|
| Authn | JWT + BCrypt |
| Authz | Role on node + method security |
| Audit | `audit_logs` append-only from service layer |
| Transport | TLS in prod (compose/reverse proxy) |
| Secrets | `config/.env` gitignored |
| Input validation | Bean Validation / Zod on UI |

## Forbidden

- Anonymous write access to workflows
- Soft-deleting audit rows
- Storing plaintext passwords
- Exposing MinIO credentials to the browser
