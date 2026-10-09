# Contributing

## For humans and agents

1. Read `AGENTS.md` and relevant `docs/` before editing
2. Prefer incremental PRs/commits over large uncontrolled diffs
3. Do not invent HAL procedure steps — source from `docs/workflows/`
4. Do not commit secrets or real customer data
5. Use `scripts/` for start/stop; document any new script in `docs/DEPLOYMENT.md`
6. Add/adjust tests for DecisionEngine and RBAC when behavior changes
7. Run the agent review checklist before requesting review

## Commit style

- Imperative subject: `Add NDT radiography seed workflow`
- Body explains why when non-obvious

## Review expectations

Reviewers verify checklist items in `docs/AGENT_REVIEW_CHECKLIST.md`, especially audit logging and server-driven transitions.
