---
name: spring-boot-enterprise
description: Enterprise Spring Boot production patterns (security, config, testing, React SPA integration, PostgreSQL). Use when editing Java/Spring server code, security, Flyway, REST APIs, or ops profiles for AMMS. Prefer jOOQ over JPA in this repo.
paths: server/**/*,docker/**/*,config/server/**/*
---

# Spring Boot Enterprise (AMMS-adapted)

Adapted from [jdubois/dr-jskill](https://github.com/jdubois/dr-jskill) references. **This repo locks jOOQ + Flyway**, not Spring Data JPA.

## When to use

- Changing `server/` Spring Security, JWT, controllers, services
- Writing Flyway migrations or PostgreSQL queries via jOOQ
- Adding tests (`DecisionEngine`, MockMvc integration)
- Tuning profiles (`dev` / `prod` / `local` / `test`)

## Non-negotiable AMMS overrides

1. **Data access:** jOOQ DAOs — do not introduce JPA entities/`JpaRepository`.
2. **Schema:** Flyway only — no Hibernate `ddl-auto`.
3. **Authz:** Enforce role on workflow transitions; attachments require auth + instance ACL.
4. **Workflow:** Server decides next node; UI never does.
5. **Secrets:** env / `.env` only — never commit credentials.

## Load references on demand

| Topic | File |
|-------|------|
| Security | `references/SECURITY.md` |
| Database / PostgreSQL | `references/DATABASE.md` |
| React SPA integration | `references/REACT.md` |
| Testing | `references/TEST.md` |
| Configuration | `references/CONFIGURATION.md` |
| Logging | `references/LOGGING.md` |

Read only the reference needed for the current task.

## Checklist before claiming server work done

- [ ] Constructor injection, `private final` deps
- [ ] DTO boundary at API (no leaking internal rows)
- [ ] Correct HTTP statuses: 400 / 403 / 404 / 409
- [ ] Audit written for Pass/Fail/Complete transitions
- [ ] `./mvnw test` (or `./scripts/verify.sh`) green
