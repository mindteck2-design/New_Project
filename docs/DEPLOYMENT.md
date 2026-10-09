# Deployment

## Layout

- Compose & Dockerfiles: `docker/`
- Env templates: `config/.env.example` → copy to `config/.env`
- Operators use `scripts/` only

## Quick start (Docker available)

```bash
cp config/.env.example config/.env
./scripts/start-services.sh
./scripts/start-ui.sh
./scripts/healthcheck.sh
```

Stop:

```bash
./scripts/stop-all.sh
```

## Quick start (local / no Docker)

Used in constrained environments:

1. PostgreSQL running with DB/user from `config/.env`
2. MongoDB binary or skip via `SPRING_PROFILES_ACTIVE=local` (JSONB forms + disk attachments)
3. `./scripts/start-services-local.sh`
4. `./scripts/start-ui.sh`

## Services (compose)

| Service | Port (default) |
|---------|----------------|
| postgres | 5432 |
| mongo | 27017 |
| minio | 9000 / 9001 |
| server | 18080 |
| ui (optional compose) | 15173 |

## Profiles

- `dev` — Docker-backed infra
- `local` — filesystem attachments + PG JSONB forms if Mongo unavailable
- `prod` — stricter security, no seed passwords in logs

## Health

- Server: `GET /actuator/health`
- Script: `scripts/healthcheck.sh`

## Full verification (all phases)

```bash
./scripts/verify.sh
```

Runs server unit + integration tests (PostgreSQL required for integration), UI production build, and healthcheck when the server is already running.

See [`docs/PHASES.md`](docs/PHASES.md) for phase completion status.
