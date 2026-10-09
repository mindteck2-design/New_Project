# Agent-Generated Change Review Checklist

Use before merging or claiming a phase complete.

## Process

- [ ] Existing docs/code inspected before edits
- [ ] Change is incremental and testable
- [ ] No invented procedure steps; gaps marked `NEEDS_REVIEW`
- [ ] Plan/docs updated if API, schema, or authz contracts changed

## Security & compliance

- [ ] No secrets committed
- [ ] RBAC enforced on mutating endpoints
- [ ] Audit log written for Pass/Fail/Reject/Approve/transition
- [ ] Attachments not anonymously accessible
- [ ] “Property of HAL” retained on user-facing surfaces

## Workflow engine

- [ ] UI does not choose next node
- [ ] Decision conditions covered by tests
- [ ] Illegal transitions return 409
- [ ] Wrong role returns 403

## Quality

- [ ] Server tests pass
- [ ] UI build/lint passes
- [ ] Migrations apply on empty DB
- [ ] `scripts/healthcheck.sh` succeeds when stack is up
- [ ] No unnecessary dependencies

## Ops

- [ ] Start/stop still work via `scripts/`
- [ ] `config/.env.example` updated for new env keys
