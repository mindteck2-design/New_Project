# Security Practices (AS 9110 C–aligned)

These practices support quality-management expectations; they do **not** claim formal certification.

## Principles

1. **Least privilege** — RBAC on every mutating workflow API
2. **Traceability** — immutable audit log for Pass/Fail/Reject/Approve/transition
3. **Confidentiality** — restrict exports and attachment downloads to authenticated roles
4. **Integrity** — server-side decision evaluation; clients cannot pick next node
5. **Attachment ACL** — documents scoped to instance; download requires authz
6. **Safe logging** — no passwords, tokens, or full form PII dumps

## Controls

| Control | Implementation |
|---------|----------------|
| Authn | JWT + BCrypt |
| Authz | Role on node + method security; `/api/v1/users/**` requires `ADMIN` |
| Audit | `audit_logs` append-only from service layer |
| Transport | TLS in prod (compose/reverse proxy) |
| Secrets | `config/.env` gitignored |
| Input validation | Bean Validation / Zod on UI |

## Forbidden

- Anonymous write access to workflows
- Soft-deleting audit rows
- Storing plaintext passwords
- Exposing MinIO credentials to the browser
- Using inactive accounts' unexpired JWTs
- Shipping demo-account selection or default credentials in production

## User lifecycle controls

- Account state and roles are reloaded from PostgreSQL when each JWT is authenticated; deactivation therefore rejects existing tokens.
- Administrator-created and reset credentials are temporary and must be changed before any other protected API route is available.
- Usernames are immutable. User records are disabled instead of deleted so workflow attribution remains intact.
- User create/update/role/status/password-reset events are recorded in `user_admin_audit_logs` in the same transaction. Audit payloads exclude passwords and tokens.
- The seeded `admin` and demo accounts are limited to `local`, `dev`, and `test` profiles. Production first-admin setup is operator-controlled via `AMMS_ADMIN_BOOTSTRAP_USERNAME` and `AMMS_ADMIN_BOOTSTRAP_PASSWORD`; remove both after successful startup before restarting.
