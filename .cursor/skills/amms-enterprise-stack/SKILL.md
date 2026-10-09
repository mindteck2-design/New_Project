---
name: amms-enterprise-stack
description: Master skill for HAL AMMS Dynamic Workflow Engine. Use for any further development — UI routes, workflow engine, RBAC, Postgres, React, shadcn. Enforces enterprise (not toy) UX and the locked production stack in AGENTS.md.
---

# AMMS Enterprise Stack (master)

Read [`AGENTS.md`](../../../AGENTS.md) first. Then apply the matching installed skill:

| Work type | Skill to load |
|-----------|----------------|
| React UI / pages / components | `react-best-practices`, `composition-patterns`, `anti-ui-slop` |
| UI review / a11y / polish | `web-design-guidelines` |
| TanStack Query / mutations / cache | `tanstack-query` |
| Spring Boot / Security / tests | `spring-boot-enterprise`, `java-springboot` |
| PostgreSQL / Flyway / indexes / JSONB | `postgresql-optimization`, `postgresql-code-review` |

## Architecture invariants

1. **React Router DOM** activity routes — never hash mega-pages.
2. **shadcn/ui only** for interactive primitives.
3. **TanStack Query + Axios** for server state; Zustand only for JWT/session.
4. **jOOQ + Flyway + PostgreSQL** for workflow/RBAC/audit.
5. **Mongo** (or PG JSONB fallback) for dynamic forms only.
6. **MinIO / filesystem** attachments behind auth.
7. **Property of HAL** on screens and exports.

## Routes (must stay)

`/`, `/analytics`, `/inbox`, `/workflows`, `/process/:key`, `/instances`, `/instances/:id`, `/login`

Every authenticated page: `Shell` + `PageHeader` (Back + breadcrumbs) + `PageFrame`.

## Enterprise UX bar

From `anti-ui-slop` + AGENTS.md:

- No toy/pastel/emoji/glow UI
- One job per page; clear hierarchy; dense operations tables/KPIs
- Loading / empty / error states
- Sidebar click changes the URL and mounts a real page

## Verify

```bash
./scripts/verify.sh
```
