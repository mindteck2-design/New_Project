# AMMS Dynamic Workflow Engine

Digitizes HAL Overhaul Division process charts as a **DB-driven workflow engine** with RBAC, decision nodes, dynamic forms, and immutable audit logs.

## Layout

| Path | Purpose |
|------|---------|
| `ui/` | React (Vite) SPA |
| `server/` | Spring Boot API + **jOOQ** + Flyway |
| `config/` | `.env.example` and profile overlays |
| `docker/` | Compose + Dockerfiles |
| `scripts/` | start / stop / healthcheck |
| `docs/` | Requirements, architecture, contracts, workflow JSON |

## Stack

- Java 21, Spring Boot, Spring Security (JWT), **jOOQ** (no JPA), Flyway, PostgreSQL
- React, Tailwind, TanStack Query, Axios, Zod / RHF, Sonner
- MongoDB optional for forms (`AMMS_FORMS_STORE=mongo`); default local uses PostgreSQL JSONB
- MinIO in compose; local disk attachments fallback

## Quick start (local, no Docker)

```bash
cp config/.env.example config/.env
# Ensure PostgreSQL is running with DB/user from config/.env
./scripts/start-services-local.sh
./scripts/start-ui.sh
./scripts/healthcheck.sh
```

- UI: http://127.0.0.1:15173  
- API: http://127.0.0.1:18080/api/v1  
- Seeded password: `Passw0rd!` (users: `admin`, `inspection.user`, `progress.user`, `shop.user`, …)

## Docker

```bash
cp config/.env.example config/.env
./scripts/start-services.sh
./scripts/start-ui.sh   # or compose profile ui
```

## Docs

Start with [`AGENTS.md`](AGENTS.md) and [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## MVP workflows

- Accessories Bench Check / Repair
- NDT Radiography
