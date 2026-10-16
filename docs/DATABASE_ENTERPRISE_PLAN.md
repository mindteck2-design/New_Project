# AMMS Database Enterprise Architecture Plan

## Purpose and scope

This is a phased plan to evolve the AMMS data layer toward enterprise-grade integrity, auditability, performance, security, and operability while preserving the locked PostgreSQL + jOOQ + Flyway, MongoDB forms, and MinIO attachment architecture. It is a plan only: it does not modify production data or introduce schema migrations.

The phrase “3N architecture” is treated as **third normal form (3NF)**. Under that interpretation, AMMS is partially normalized rather than verifiably 3NF end-to-end. The backend is also a three-layered UI/API/data solution, but is currently a modular monolith, not three independently deployed services.

Assessment evidence is limited to Flyway V1-V5 and inspected source/configuration. No live database catalog, row counts, query plans, MongoDB index catalog, or production security settings were available for this assessment. Prior integration attempts were blocked by PostgreSQL authentication, so live conformance must be a gate in Phase 0.

## Current-state decision

**Do not begin partitioning, replicas, or a broad schema rewrite yet.** First establish a live baseline and resolve authoritative data ownership. The immediate integrity issues are well-defined, but index, partition, and retention choices depend on actual data volume, query plans, retention policy, and evidence requirements.

### Findings to address

| Priority | Finding | Enterprise impact |
|---|---|---|
| P0 | `workflow_definitions.definition_json` duplicates graph data also stored in `workflow_nodes` and `workflow_transitions`; the application reads both forms. | Competing sources of truth can diverge, and definition updates can cause inconsistent runtime behavior. |
| P0 | `workflow_transitions.from_node_key` / `to_node_key`, `workflow_instances.current_node_key`, and node-key-bearing records are not protected by composite references to `(definition_id, node_key)`. | Orphan or cross-definition node references can be persisted despite application checks. |
| P0 | `audit_logs.instance_id` / `user_id` lack FKs; role references in workflow nodes and notifications are strings without FK constraints. | Referential integrity and audit identity are weaker than the identity/inspection/document models. |
| P1 | Workflow definitions have a mutable row and version field, rather than an immutable published-version history. | Existing instances can be difficult to reproduce against the exact graph used at start time. |
| P1 | Analytics loads all visible instances and repeatedly fetches definitions/nodes, while some service list paths also materialize broad result sets. | Work grows with total history; query count and memory use can become unacceptable as the database grows. |
| P1 | Mongo form reads filter by `formKey` or `(instanceId, nodeKey, formKey, createdAt)` but explicit secondary indexes are not created in inspected code. | Form/schema lookups may become collection scans; schema uniqueness is assumed by application behavior. |
| P1 | PostgreSQL and MongoDB writes are not one transaction; no outbox/reconciliation process was found. | A committed workflow action can disagree with its form submission or a related notification after partial failure. |
| P2 | Audit retention, immutability enforcement, data classification, encryption posture, and restore drills are not evidenced in repository configuration. | Regulated maintenance records need defensible access, retention, tamper-evidence, and recovery controls. |

Core identity associations (`users`, `roles`, `user_roles`), work-package header/part separation, and per-user notification read state are good normalized foundations. JSONB is appropriate for variable form payloads, snapshots, and context when treated as an explicit aggregate boundary; it should not be used as a second writable copy of the workflow graph.

## Target principles

1. **One canonical source per fact.** Published workflow versions are immutable; runtime graph data and its serialized representation are produced from one authoritative version.
2. **Database-enforced integrity.** PKs, unique constraints, FKs, check constraints, and valid state transitions should guard durable facts rather than relying only on service code.
3. **Audit-first lifecycle.** Audit evidence is append-only to application roles, traceable to retained principals/instances, and governed by a documented retention schedule.
4. **Measured performance.** Use representative `EXPLAIN (ANALYZE, BUFFERS)` results and bounded query contracts before adding indexes or reporting infrastructure.
5. **Additive, observable change.** Preserve existing APIs and data; backfill and validate before enforcing constraints; deploy compatible server code and migrations in deliberate order.
6. **Explicit data boundaries.** Keep PostgreSQL as the system of record for workflow/RBAC/audit, MongoDB for dynamic forms, and MinIO for attachments, with clear consistency and retention policies.
7. **Operational recovery is a release criterion.** Backups are not complete until restore drills verify database, MongoDB, and object-store recovery together.

## Phased implementation roadmap

### Phase 0 — Live baseline and architecture decisions

**Deliverables**

- Establish read-only access to the target PostgreSQL and MongoDB environments; collect schema catalogs, migration history, approximate row counts, table/index sizes, existing constraints, and Mongo indexes.
- Capture representative query plans and query statistics for inbox, instance list/detail, audit history, package/part lists, notifications, and analytics.
- Confirm the authoritative workflow-definition representation and the supported retention periods for workflow records, audit logs, forms, and attachments.
- Classify fields and records with data owners, including user PII, authentication material, aircraft/part maintenance data, signatures, and uploaded documents.
- Record baseline latency, query count, pool utilization, and growth assumptions before setting SLOs.

**Exit criteria**

- No production credentials or personal data are placed in source control or assessment artifacts.
- The accepted data inventory matches live catalogs and Flyway history.
- Owners approve the canonical workflow model and retention/classification decisions.

### Phase 1 — Canonical, versioned workflow definitions

**Recommended target**

- Make normalized `workflow_nodes` and `workflow_transitions` the authoritative runtime representation.
- Publish immutable workflow-definition versions. Keep a stable logical workflow key and create a new definition/version row for each publication; instances reference the exact immutable version.
- Generate or persist a read-only JSON snapshot from the same published version for transfer, review, or export. Do not independently edit the snapshot and graph rows.
- Make publication atomic: validate the complete graph, persist its version and child rows in one transaction, then mark that version published. Do not delete graph rows for a version already referenced by instances.
- Add uniqueness for `(workflow_key, version)` and `(definition_id, node_key)` (the latter already exists for nodes); define how active-version selection works.

**Migration approach**

1. Add the version-history structure additively and backfill existing definitions as the initial published version.
2. Compare each JSON graph with its normalized node/transition rows and produce a mismatch report before choosing source-of-truth values.
3. Add compatibility reads/writes during a bounded transition period; record divergence metrics and reject new mismatches.
4. Switch runtime reads to immutable normalized versions; retain the JSON snapshot for provenance, not independent mutation.
5. Remove obsolete mutable-write behavior only after all supported clients use the versioned path.

**Exit criteria**

- Every running and completed instance points to an immutable definition version.
- Graph-to-snapshot parity is tested and no existing instance loses its effective definition.
- Publication and rollback are covered by repository/service tests.

### Phase 2 — Referential integrity and valid domain constraints

Add constraints through additive Flyway migrations after an orphan scan and explicit remediation report:

- Add composite FKs from transition `(definition_id, from_node_key)` and `(definition_id, to_node_key)` to node `(definition_id, node_key)`.
- Add a composite FK from instance `(definition_id, current_node_key)` to its version's node key, after confirming terminal-node and migration semantics.
- Add composite node references for inspection records, documents, and PostgreSQL form fallback rows where the node identity is applicable; nullable node keys must retain intended semantics.
- Add FKs for `audit_logs.instance_id` and `audit_logs.user_id` only after the audit retention/deletion policy is approved. Prefer `RESTRICT` or deliberate tombstone/snapshot behavior over cascading deletion of audit evidence.
- Add role-code FKs for `workflow_nodes.role_code` and `workflow_notifications.target_role` referencing the unique `roles.code`. Define how inactive/retired roles remain readable in historical audit records.
- Add a unique index on MongoDB `form_schemas.formKey`, because service code treats it as a singleton key. Add a compound `form_submissions` index matching latest-submission lookup `(instanceId, nodeKey, formKey, createdAt DESC)`.
- Review state columns for DB check constraints. Only constrain enumerations whose evolution policy is understood; do not encode procedural workflow rules as hard-to-change DB checks.
- Review `work_package_parts.instance_id` cardinality and enforce uniqueness only if the business invariant is confirmed.

For potentially large live tables, add FKs/constraints using a validated rollout (`NOT VALID` then `VALIDATE CONSTRAINT` where supported) after cleaning existing orphans. Never drop/cascade data as a shortcut.

**Exit criteria**

- All pre-existing orphan rows have a signed-off remediation outcome.
- Constraint validation succeeds in a production-like copy.
- Integration tests prove invalid cross-definition references fail at the database boundary.
- Audit retention and user deactivation behavior are documented and tested.

### Phase 3 — Transactional consistency, audit, and retention

- Define the transaction boundary for a form submission, workflow action, inspection outcome, and notification creation.
- Keep PostgreSQL state and its audit record in the same transaction. Make audit rows append-only for the runtime database role; separate migration/maintenance permissions from runtime permissions.
- For side effects that cross PostgreSQL/MongoDB or PostgreSQL/object storage, introduce an idempotent outbox/event record in PostgreSQL and a retryable consumer, or define a documented compensating/reconciliation process. Do not imply a distributed transaction exists.
- Define immutable retention classes and legal/quality-record holds for audit logs, forms, workflow instances, and attachment objects. Include deletion, archival, and subject/account deactivation rules.
- Keep attachment ACL metadata and object lifecycle in sync; provide a reconciliation report for missing metadata/objects and orphaned objects.
- Partition or archive high-volume time-series tables only after Phase 0 measures volume and retention. Partitioning `audit_logs` changes unique-key requirements (partition keys must be reflected in unique constraints) and must be designed with jOOQ/codegen and audit lookup paths.

**Exit criteria**

- Fault-injection tests demonstrate retries do not duplicate actions or corrupt audit/form state.
- Retention rules identify data owner, trigger, duration, legal hold, and deletion/archive behavior.
- Restore and retention drills preserve audit provenance and object references.

### Phase 4 — Bounded query paths and reporting

- Replace full-table instance loading with server-side filtering, stable keyset pagination for large operational lists, and explicit maximum page sizes.
- Rewrite analytics as bounded SQL aggregates scoped by authorization predicates and time windows; avoid per-instance definition/node fetches. Preserve role visibility and verify result parity against current behavior.
- Inspect index usage for each high-volume query before adding or changing indexes. Existing indexes cover some status/time, running-node, notification-role/time, instance audit, and inspection paths; do not duplicate them blindly.
- Evaluate composite/partial indexes using actual filter, join, sort, and selectivity patterns. Include write cost and index size in acceptance.
- Ensure Mongo query indexes match schema and submission access patterns; validate plans on production-like collection cardinality.
- Create a separate reporting read model or replica only when primary workload measurements show contention and freshness requirements permit it. Document lag and access controls.
- Use aggregation snapshots/materialized views only for metrics with defined refresh cadence, correction semantics, and source lineage.

**Exit criteria**

- Each high-volume endpoint has a documented query bound, authorization scope, measured plan, and latency target.
- Analytics no longer scales its query count linearly with instance count.
- Load tests use realistic multi-year data and include write-heavy workflow transitions.

### Phase 5 — Security, resilience, and operations

- Use separate least-privilege identities for Flyway migrations, application runtime, reporting, and backup/restore. Runtime must not own schema or bypass audit policy.
- Require TLS for database connections in deployed environments; verify disk/storage encryption at rest with the platform operator. Add field-level encryption only for specifically classified data with key lifecycle and query implications documented.
- Review PII and maintenance-record access, attachment ACLs, MongoDB roles, database network boundaries, secret rotation, and redaction in logs/exports.
- Tune connection-pool limits against database connection budgets and service replicas; publish saturation, wait, slow-query, deadlock, and replication-lag metrics.
- Define encrypted, offsite PostgreSQL backups with point-in-time recovery, plus MongoDB and MinIO backup/versioning policy. Document RPO/RTO and test full cross-store recovery.
- Schedule restore drills and verify Flyway history, referential integrity, Mongo submission lookup, attachment access, and audit continuity after restore.

**Exit criteria**

- Approved RPO/RTO targets are met in a witnessed recovery test.
- Runtime and migration credentials are distinct and least-privileged.
- Security review and operational runbooks are accepted by owners.

## Quality gates before production rollout

1. `mvn verify` and focused repository/service integration tests pass against PostgreSQL; Flyway migrates both an empty database and a production-like copy.
2. Migration tests cover backfill counts, orphan reports, rollback/forward recovery, and old application compatibility during rolling deployment.
3. jOOQ generated sources are rebuilt from Flyway migrations; generated code and SQL changes are reviewed together.
4. Query-plan/load tests use representative data volume and concurrency; index additions show measurable benefit without unacceptable write amplification.
5. MongoDB index migration is idempotent and validated against existing duplicates before unique enforcement.
6. End-to-end workflow, form, audit, notification, and attachment reconciliation tests pass under injected partial failures.
7. Backup restore drills meet the signed-off RPO/RTO and preserve audit/attachment references.
8. Data classification, access matrix, retention schedule, and runbooks are reviewed and approved by their operational owners.

## First recommended implementation batch

1. Resolve a read-only live database connection and complete Phase 0 inventory; do not change schema before this is available.
2. Produce a workflow JSON-vs-normalized graph reconciliation report and decide/version the canonical representation.
3. Add integrity constraints for workflow node references and role codes after catalog/orphan scans.
4. Create Mongo collection indexes via an idempotent, versioned application migration path.
5. Replace unbounded analytics/list reads with paged and SQL-aggregated paths; validate authorization parity.
6. Establish audit retention, database roles, backup/PITR, and restore-drill requirements before partitioning or archiving.

No schema migration, destructive operation, or production configuration change is authorized by this plan.
