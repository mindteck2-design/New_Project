---
name: role-work-queue
description: Curate role-wise pending actions and post-login briefing copy for AMMS. Use when building dashboards, inboxes, empty states, or guided "what should I do" experiences per role.
---

# Role work queue (AMMS)

## Product pattern

After login, each user sees a **role-adapted homepage briefing**, not a generic module grid.

1. **Welcome line** — name + active role label(s)
2. **Your charge** — 1–2 sentences of what this role owns in Overhaul Division
3. **What to do now** — pending instances whose `currentNode.roleCode` matches their roles (review queue)
4. **If empty** — explain *why* the queue is clear + one next action (start workflow / wait for handoff / switch role)

## Sources (research)

- Review queue UX: why-in-queue, counts, empty state, next item (uxpatternsguide.com/patterns/review-queue)
- Role-adapted homepage: show activity links only for roles with active tasks
- Empty states: specific scope copy (“No steps waiting on Progress”) — never blank silence

## Copy rules

- Enterprise aerospace tone (HAL / AS 9110 C). No emoji, no “Welcome to your app.”
- Name the **step label**, **workflow**, **business key**, and **required role** on every row.
- Primary verb: **Open step** / **Continue** — never invent next node keys in the UI.
- Multi-role users (admin): group pending work **by role**, with a short charge under each group.

## Implementation map

| File | Role |
|------|------|
| `ui/src/lib/roleGuidance.js` | Curated role briefs + empty CTAs |
| `ui/src/components/RoleWorkBriefing.jsx` | Post-login briefing hero |
| `ui/src/components/PendingWorkQueue.jsx` | Role-grouped actionable queue |
| `ui/src/pages/WorkflowDashboard.jsx` | Home = briefing + queue |
| `ui/src/pages/InboxPage.jsx` | Full review queue |

## Do not

- Dump every module equally when the user has pending work
- Hard-code `NEXT_NODE` in the UI
- Use toy/pastel empty-state illustrations
