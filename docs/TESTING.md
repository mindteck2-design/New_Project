# Testing Strategy

## Layers

| Layer | Focus | Location |
|-------|-------|----------|
| Unit | `DecisionEngine` condition evaluation; transition selection | `server/.../workflow` |
| Integration | Start instance → decide → complete; illegal transition → 409 | Spring Boot tests + Testcontainers when Docker available |
| API | Contract smoke for login, start, transition | `@SpringBootTest` + MockMvc |
| UI | Form/decision render against mocked API | Vitest (optional MVP); manual checklist required |

## Must-pass before merge

1. Decision PASS/FAIL routes to correct target nodes for Accessories Bench Check
2. User without node role receives 403
3. Audit row written on each transition
4. `./scripts/healthcheck.sh` green when stack is up

## Manual smoke

1. Login as inspection user
2. Start Accessories Bench Check
3. Fail → repair path → retest → pass → BER decision
4. Start NDT Radiography → accept → completed
5. Verify audit trail lists actions with timestamps
