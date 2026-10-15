# Deployment

## Layout

- Compose & Dockerfiles: `docker/`
- Env templates: `config/.env.example` → copy to `config/.env`
- Operators use `scripts/` only

## Environment (enterprise — prompt: top-level `.env`)

| File | Purpose |
|------|---------|
| `.env.example` → `.env` | **Primary** server/infra env (gitignored) |
| `config/.env` | Optional overlay (loaded after root `.env`) |
| `config/ui/.env.example` | UI `VITE_*` contract documentation |
| `config/ui/.env.development` | Local Vite: `VITE_API_URL=/api/v1` + proxy to Spring |
| `config/ui/.env.production` | Production build defaults (override `VITE_API_URL` in CI) |

UI validates env at boot (`ui/src/config/env.js`). Dev traffic uses a **Vite same-origin `/api` proxy** so the browser does not hit CORS. Spring still allows explicit origins via `AMMS_CORS_ALLOWED_ORIGINS` for non-proxied clients.

## Quick start (Docker available)

```bash
cp .env.example .env
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

1. PostgreSQL running with DB/user from root `.env`
2. MongoDB binary or skip via `SPRING_PROFILES_ACTIVE=local` (JSONB forms + disk attachments)
3. `./scripts/start-services-local.sh`
4. `./scripts/start-ui.sh`

## Services (compose)

| Service | Port (default) |
|---------|----------------|
| postgres | 5432 |
| mongo | 27017 (`MONGODB_URI`, `AMMS_FORMS_STORE=mongo`; Spring Boot 4 uses `spring.mongodb.uri`) |
| minio | 9000 / 9001 |
| server | 8080 |
| ui (optional compose) | 5173 |

## Profiles

- `dev` — Docker-backed infra
- `local` — filesystem attachments + PG JSONB forms if Mongo unavailable
- `prod` — stricter security, no seed passwords in logs

### Initial production administrator

Production does not seed demo users. For a first deployment with no administrator account, operators may supply `AMMS_ADMIN_BOOTSTRAP_USERNAME` and `AMMS_ADMIN_BOOTSTRAP_PASSWORD` through the deployment's protected secret mechanism. The application creates one active account with only the `ADMIN` role, forces a password change at first sign-in, and records an initial bootstrap audit event. The password must meet the same policy as temporary account credentials (at least 12 characters and no more than 72 UTF-8 bytes).

Remove both bootstrap variables from the secret source immediately after successful startup. If any administrator account already exists while either variable is configured, startup fails rather than reusing or silently ignoring bootstrap credentials. Do not put actual credentials in `.env.example`, documentation, or source control.

## Health

- Server: `GET /actuator/health`
- Script: `scripts/healthcheck.sh`

## Full verification (all phases)

```bash
./scripts/verify.sh
```

Runs server unit + integration tests (PostgreSQL required for integration), UI production build, and healthcheck when the server is already running.

See [`docs/PHASES.md`](docs/PHASES.md) for phase completion status.
