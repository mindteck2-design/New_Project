# Development Workflow

## Daily loop

1. Pull / sync branch
2. Ensure `config/.env` exists
3. `./scripts/start-services.sh` (or `start-services-local.sh`)
4. `./scripts/start-ui.sh`
5. Make a small, testable change
6. Run server tests + UI build
7. `./scripts/healthcheck.sh`
8. Commit with a clear message; push

## Adding a workflow definition

1. Author JSON under `docs/workflows/<key>.json`
2. Mark unclear branches `NEEDS_REVIEW`
3. Load via `./scripts/seed.sh` or app bootstrap
4. Add at least one DecisionEngine / transition test for critical branches
5. Update `docs/REQUIREMENTS.md` if scope changes

## Coding standards

- Prefer clear names over comments
- Keep controllers thin; logic in services
- Match existing package layout under `com.hal.amms`
- UI: shadcn primitives; no hard-coded next-step routing

## Verification before handoff

Complete `docs/AGENT_REVIEW_CHECKLIST.md`.
