# Installed agent skills — provenance

Downloaded for AMMS Dynamic Workflow Engine development. Project skills live in `.cursor/skills/`.

| Skill | Source | Purpose |
|-------|--------|---------|
| `tanstack-query` | https://github.com/DeckardGer/tanstack-agent-skills | Query keys, caching, mutations |
| `react-best-practices` | https://github.com/vercel-labs/agent-skills | React quality / a11y / performance |
| `web-design-guidelines` | https://github.com/vercel-labs/agent-skills (+ web-interface-guidelines) | Enterprise UI review |
| `composition-patterns` | https://github.com/vercel-labs/agent-skills | React composition patterns |
| `anti-ui-slop` | https://github.com/github/awesome-copilot | Prevent toy/generic UI |
| `postgresql-optimization` | https://github.com/github/awesome-copilot | PG/JSONB/index patterns |
| `postgresql-code-review` | https://github.com/github/awesome-copilot | SQL review |
| `data-architecture` | VS Code Copilot installed skill, copied to this workspace | Database configuration, ownership boundaries, entity model, and persistence assessment |
| `java-springboot` | https://github.com/github/awesome-copilot | Spring Boot practices |
| `spring-boot-enterprise` | Adapted from https://github.com/jdubois/dr-jskill | Security/DB/React/Test refs |
| `amms-enterprise-stack` | Project-authored | Binds skills to AMMS locked stack |
| `building-components` | https://github.com/vercel/components.build | Accessible composable UI components |
| `role-work-queue` | Project-authored (review-queue UX research) | Role briefing + pending action curation |

**AMMS overrides:** jOOQ (not JPA), React Router DOM (not inventing TanStack Router), shadcn-only UI, Flyway-only schema, server-driven workflow.
