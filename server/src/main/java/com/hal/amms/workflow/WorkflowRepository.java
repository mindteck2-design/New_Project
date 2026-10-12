package com.hal.amms.workflow;

import com.hal.amms.shared.AmmsDateTimes;
import com.hal.amms.shared.EnumCodes;
import com.hal.amms.workflow.domain.*;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.jooq.Tables.*;

@Repository
public class WorkflowRepository {

    private final DSLContext dsl;

    public WorkflowRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<WorkflowDefinition> listActiveDefinitions() {
        return listDefinitions(false);
    }

    public List<WorkflowDefinition> listDefinitions(boolean includeInactive) {
        var base = dsl.select(
                        WORKFLOW_DEFINITIONS.ID,
                        WORKFLOW_DEFINITIONS.KEY,
                        WORKFLOW_DEFINITIONS.NAME,
                        WORKFLOW_DEFINITIONS.VERSION,
                        WORKFLOW_DEFINITIONS.ACTIVE,
                        WORKFLOW_DEFINITIONS.DEFINITION_JSON
                )
                .from(WORKFLOW_DEFINITIONS);
        var step = includeInactive
                ? base.where(org.jooq.impl.DSL.trueCondition())
                : base.where(WORKFLOW_DEFINITIONS.ACTIVE.isTrue());
        return step
                .orderBy(WORKFLOW_DEFINITIONS.NAME.asc())
                .fetch(r -> new WorkflowDefinition(
                        r.get(WORKFLOW_DEFINITIONS.ID),
                        r.get(WORKFLOW_DEFINITIONS.KEY),
                        r.get(WORKFLOW_DEFINITIONS.NAME),
                        r.get(WORKFLOW_DEFINITIONS.VERSION),
                        Boolean.TRUE.equals(r.get(WORKFLOW_DEFINITIONS.ACTIVE)),
                        jsonb(r.get(WORKFLOW_DEFINITIONS.DEFINITION_JSON))
                ));
    }

    public Optional<WorkflowDefinition> findDefinitionByKey(String key) {
        return findDefinitionByKey(key, true);
    }

    /** @param activeOnly when true, inactive charts are hidden (runtime start path). */
    public Optional<WorkflowDefinition> findDefinitionByKey(String key, boolean activeOnly) {
        var condition = WORKFLOW_DEFINITIONS.KEY.eq(key);
        if (activeOnly) {
            condition = condition.and(WORKFLOW_DEFINITIONS.ACTIVE.isTrue());
        }
        return dsl.select(
                        WORKFLOW_DEFINITIONS.ID,
                        WORKFLOW_DEFINITIONS.KEY,
                        WORKFLOW_DEFINITIONS.NAME,
                        WORKFLOW_DEFINITIONS.VERSION,
                        WORKFLOW_DEFINITIONS.ACTIVE,
                        WORKFLOW_DEFINITIONS.DEFINITION_JSON
                )
                .from(WORKFLOW_DEFINITIONS)
                .where(condition)
                .fetchOptional(r -> new WorkflowDefinition(
                        r.get(WORKFLOW_DEFINITIONS.ID),
                        r.get(WORKFLOW_DEFINITIONS.KEY),
                        r.get(WORKFLOW_DEFINITIONS.NAME),
                        r.get(WORKFLOW_DEFINITIONS.VERSION),
                        Boolean.TRUE.equals(r.get(WORKFLOW_DEFINITIONS.ACTIVE)),
                        jsonb(r.get(WORKFLOW_DEFINITIONS.DEFINITION_JSON))
                ));
    }

    public void setDefinitionActive(String key, boolean active) {
        int updated = dsl.update(WORKFLOW_DEFINITIONS)
                .set(WORKFLOW_DEFINITIONS.ACTIVE, active)
                .where(WORKFLOW_DEFINITIONS.KEY.eq(key))
                .execute();
        if (updated == 0) {
            throw new IllegalArgumentException("Workflow not found: " + key);
        }
    }

    public void bumpDefinitionVersion(String key, int version, String definitionJson) {
        JSONB json = JSONB.valueOf(definitionJson);
        dsl.update(WORKFLOW_DEFINITIONS)
                .set(WORKFLOW_DEFINITIONS.VERSION, version)
                .set(WORKFLOW_DEFINITIONS.DEFINITION_JSON, json)
                .where(WORKFLOW_DEFINITIONS.KEY.eq(key))
                .execute();
    }

    public Optional<WorkflowDefinition> findDefinitionById(UUID id) {
        return dsl.select(WORKFLOW_DEFINITIONS.ID, WORKFLOW_DEFINITIONS.KEY, WORKFLOW_DEFINITIONS.NAME, WORKFLOW_DEFINITIONS.VERSION, WORKFLOW_DEFINITIONS.ACTIVE, WORKFLOW_DEFINITIONS.DEFINITION_JSON)
                .from(WORKFLOW_DEFINITIONS)
                .where(WORKFLOW_DEFINITIONS.ID.eq(id))
                .fetchOptional(r -> new WorkflowDefinition(
                        r.get(WORKFLOW_DEFINITIONS.ID), r.get(WORKFLOW_DEFINITIONS.KEY), r.get(WORKFLOW_DEFINITIONS.NAME), r.get(WORKFLOW_DEFINITIONS.VERSION),
                        Boolean.TRUE.equals(r.get(WORKFLOW_DEFINITIONS.ACTIVE)), jsonb(r.get(WORKFLOW_DEFINITIONS.DEFINITION_JSON))
                ));
    }

    public boolean definitionExists(String key) {
        return dsl.fetchExists(dsl.selectOne().from(WORKFLOW_DEFINITIONS).where(WORKFLOW_DEFINITIONS.KEY.eq(key)));
    }

    public void upsertDefinition(UUID id, String key, String name, int version, String definitionJson) {
        JSONB json = JSONB.valueOf(definitionJson);
        int updated = dsl.update(WORKFLOW_DEFINITIONS)
                .set(WORKFLOW_DEFINITIONS.NAME, name)
                .set(WORKFLOW_DEFINITIONS.VERSION, version)
                .set(WORKFLOW_DEFINITIONS.ACTIVE, true)
                .set(WORKFLOW_DEFINITIONS.DEFINITION_JSON, json)
                .where(WORKFLOW_DEFINITIONS.KEY.eq(key))
                .execute();
        if (updated == 0) {
            dsl.insertInto(WORKFLOW_DEFINITIONS)
                    .columns(WORKFLOW_DEFINITIONS.ID, WORKFLOW_DEFINITIONS.KEY, WORKFLOW_DEFINITIONS.NAME, WORKFLOW_DEFINITIONS.VERSION, WORKFLOW_DEFINITIONS.ACTIVE, WORKFLOW_DEFINITIONS.DEFINITION_JSON)
                    .values(id, key, name, version, true, json)
                    .execute();
        }
        UUID defId = dsl.select(WORKFLOW_DEFINITIONS.ID).from(WORKFLOW_DEFINITIONS).where(WORKFLOW_DEFINITIONS.KEY.eq(key)).fetchOne(WORKFLOW_DEFINITIONS.ID);
        dsl.deleteFrom(WORKFLOW_TRANSITIONS).where(WORKFLOW_TRANSITIONS.DEFINITION_ID.eq(defId)).execute();
        dsl.deleteFrom(WORKFLOW_NODES).where(WORKFLOW_NODES.DEFINITION_ID.eq(defId)).execute();
    }

    public void insertNode(WorkflowNode node) {
        dsl.insertInto(WORKFLOW_NODES)
                .columns(WORKFLOW_NODES.ID, WORKFLOW_NODES.DEFINITION_ID, WORKFLOW_NODES.NODE_KEY, WORKFLOW_NODES.NODE_TYPE, WORKFLOW_NODES.ROLE_CODE, WORKFLOW_NODES.FORM_KEY, WORKFLOW_NODES.LABEL, WORKFLOW_NODES.CONFIG_JSON)
                .values(
                        node.id(), node.definitionId(), node.nodeKey(), EnumCodes.code(node.nodeType()),
                        node.roleCode(), node.formKey(), node.label(),
                        node.configJson() == null ? null : JSONB.valueOf(node.configJson())
                )
                .execute();
    }

    public void insertTransition(WorkflowTransition t) {
        dsl.insertInto(WORKFLOW_TRANSITIONS)
                .columns(WORKFLOW_TRANSITIONS.ID, WORKFLOW_TRANSITIONS.DEFINITION_ID, WORKFLOW_TRANSITIONS.FROM_NODE_KEY, WORKFLOW_TRANSITIONS.TO_NODE_KEY, WORKFLOW_TRANSITIONS.CONDITION_VALUE, WORKFLOW_TRANSITIONS.PRIORITY)
                .values(t.id(), t.definitionId(), t.fromNodeKey(), t.toNodeKey(), t.conditionValue(), t.priority())
                .execute();
    }

    public UUID definitionIdByKey(String key) {
        return dsl.select(WORKFLOW_DEFINITIONS.ID).from(WORKFLOW_DEFINITIONS).where(WORKFLOW_DEFINITIONS.KEY.eq(key)).fetchOne(WORKFLOW_DEFINITIONS.ID);
    }

    public List<WorkflowNode> nodesFor(UUID definitionId) {
        return dsl.select(WORKFLOW_NODES.ID, WORKFLOW_NODES.DEFINITION_ID, WORKFLOW_NODES.NODE_KEY, WORKFLOW_NODES.NODE_TYPE, WORKFLOW_NODES.ROLE_CODE, WORKFLOW_NODES.FORM_KEY, WORKFLOW_NODES.LABEL, WORKFLOW_NODES.CONFIG_JSON)
                .from(WORKFLOW_NODES)
                .where(WORKFLOW_NODES.DEFINITION_ID.eq(definitionId))
                .fetch(this::mapNode);
    }

    public Optional<WorkflowNode> findNode(UUID definitionId, String nodeKey) {
        return dsl.select(WORKFLOW_NODES.ID, WORKFLOW_NODES.DEFINITION_ID, WORKFLOW_NODES.NODE_KEY, WORKFLOW_NODES.NODE_TYPE, WORKFLOW_NODES.ROLE_CODE, WORKFLOW_NODES.FORM_KEY, WORKFLOW_NODES.LABEL, WORKFLOW_NODES.CONFIG_JSON)
                .from(WORKFLOW_NODES)
                .where(WORKFLOW_NODES.DEFINITION_ID.eq(definitionId).and(WORKFLOW_NODES.NODE_KEY.eq(nodeKey)))
                .fetchOptional(this::mapNode);
    }

    public void updateNodeFormKey(UUID definitionId, String nodeKey, String formKey) {
        int updated = dsl.update(WORKFLOW_NODES)
                .set(WORKFLOW_NODES.FORM_KEY, formKey)
                .where(WORKFLOW_NODES.DEFINITION_ID.eq(definitionId).and(WORKFLOW_NODES.NODE_KEY.eq(nodeKey)))
                .execute();
        if (updated == 0) {
            throw new IllegalArgumentException("Node not found: " + nodeKey);
        }
    }

    public String definitionJsonById(UUID definitionId) {
        return dsl.select(WORKFLOW_DEFINITIONS.DEFINITION_JSON)
                .from(WORKFLOW_DEFINITIONS)
                .where(WORKFLOW_DEFINITIONS.ID.eq(definitionId))
                .fetchOne(r -> {
                    JSONB j = r.get(WORKFLOW_DEFINITIONS.DEFINITION_JSON);
                    return j == null ? null : j.data();
                });
    }

    public void updateDefinitionJson(UUID definitionId, String definitionJson) {
        dsl.update(WORKFLOW_DEFINITIONS)
                .set(WORKFLOW_DEFINITIONS.DEFINITION_JSON, JSONB.valueOf(definitionJson))
                .where(WORKFLOW_DEFINITIONS.ID.eq(definitionId))
                .execute();
    }

    public List<WorkflowTransition> transitionsFrom(UUID definitionId, String fromNodeKey) {
        return dsl.select(WORKFLOW_TRANSITIONS.ID, WORKFLOW_TRANSITIONS.DEFINITION_ID, WORKFLOW_TRANSITIONS.FROM_NODE_KEY, WORKFLOW_TRANSITIONS.TO_NODE_KEY, WORKFLOW_TRANSITIONS.CONDITION_VALUE, WORKFLOW_TRANSITIONS.PRIORITY)
                .from(WORKFLOW_TRANSITIONS)
                .where(WORKFLOW_TRANSITIONS.DEFINITION_ID.eq(definitionId).and(WORKFLOW_TRANSITIONS.FROM_NODE_KEY.eq(fromNodeKey)))
                .orderBy(WORKFLOW_TRANSITIONS.PRIORITY.asc())
                .fetch(r -> new WorkflowTransition(
                        r.get(WORKFLOW_TRANSITIONS.ID), r.get(WORKFLOW_TRANSITIONS.DEFINITION_ID), r.get(WORKFLOW_TRANSITIONS.FROM_NODE_KEY), r.get(WORKFLOW_TRANSITIONS.TO_NODE_KEY),
                        r.get(WORKFLOW_TRANSITIONS.CONDITION_VALUE), r.get(WORKFLOW_TRANSITIONS.PRIORITY)
                ));
    }

    /** All transitions for a definition (clone / export). Ordered by from-node then priority. */
    public List<WorkflowTransition> transitionsFor(UUID definitionId) {
        return dsl.select(
                        WORKFLOW_TRANSITIONS.ID,
                        WORKFLOW_TRANSITIONS.DEFINITION_ID,
                        WORKFLOW_TRANSITIONS.FROM_NODE_KEY,
                        WORKFLOW_TRANSITIONS.TO_NODE_KEY,
                        WORKFLOW_TRANSITIONS.CONDITION_VALUE,
                        WORKFLOW_TRANSITIONS.PRIORITY
                )
                .from(WORKFLOW_TRANSITIONS)
                .where(WORKFLOW_TRANSITIONS.DEFINITION_ID.eq(definitionId))
                .orderBy(WORKFLOW_TRANSITIONS.FROM_NODE_KEY.asc(), WORKFLOW_TRANSITIONS.PRIORITY.asc())
                .fetch(r -> new WorkflowTransition(
                        r.get(WORKFLOW_TRANSITIONS.ID),
                        r.get(WORKFLOW_TRANSITIONS.DEFINITION_ID),
                        r.get(WORKFLOW_TRANSITIONS.FROM_NODE_KEY),
                        r.get(WORKFLOW_TRANSITIONS.TO_NODE_KEY),
                        r.get(WORKFLOW_TRANSITIONS.CONDITION_VALUE),
                        r.get(WORKFLOW_TRANSITIONS.PRIORITY)
                ));
    }

    public void insertInstance(WorkflowInstance i) {
        dsl.insertInto(WORKFLOW_INSTANCES)
                .columns(WORKFLOW_INSTANCES.ID, WORKFLOW_INSTANCES.DEFINITION_ID, WORKFLOW_INSTANCES.BUSINESS_KEY, WORKFLOW_INSTANCES.STATUS, WORKFLOW_INSTANCES.CURRENT_NODE_KEY, WORKFLOW_INSTANCES.CONTEXT_JSON, WORKFLOW_INSTANCES.STARTED_BY, WORKFLOW_INSTANCES.STARTED_AT, WORKFLOW_INSTANCES.UPDATED_AT)
                .values(
                        i.id(), i.definitionId(), i.businessKey(), EnumCodes.code(i.status()), i.currentNodeKey(),
                        JSONB.valueOf(i.contextJson() == null ? "{}" : i.contextJson()),
                        i.startedBy(), toOdt(i.startedAt()), toOdt(i.updatedAt())
                )
                .execute();
    }

    public void updateInstance(WorkflowInstance i) {
        dsl.update(WORKFLOW_INSTANCES)
                .set(WORKFLOW_INSTANCES.STATUS, EnumCodes.code(i.status()))
                .set(WORKFLOW_INSTANCES.CURRENT_NODE_KEY, i.currentNodeKey())
                .set(WORKFLOW_INSTANCES.CONTEXT_JSON, JSONB.valueOf(i.contextJson() == null ? "{}" : i.contextJson()))
                .set(WORKFLOW_INSTANCES.UPDATED_AT, toOdt(i.updatedAt()))
                .where(WORKFLOW_INSTANCES.ID.eq(i.id()))
                .execute();
    }

    public Optional<WorkflowInstance> findInstance(UUID id) {
        return dsl.select(WORKFLOW_INSTANCES.ID, WORKFLOW_INSTANCES.DEFINITION_ID, WORKFLOW_INSTANCES.BUSINESS_KEY, WORKFLOW_INSTANCES.STATUS, WORKFLOW_INSTANCES.CURRENT_NODE_KEY, WORKFLOW_INSTANCES.CONTEXT_JSON, WORKFLOW_INSTANCES.STARTED_BY, WORKFLOW_INSTANCES.STARTED_AT, WORKFLOW_INSTANCES.UPDATED_AT)
                .from(WORKFLOW_INSTANCES)
                .where(WORKFLOW_INSTANCES.ID.eq(id))
                .fetchOptional(this::mapInstance);
    }

    public boolean instanceExists(UUID id) {
        return dsl.fetchExists(dsl.selectOne().from(WORKFLOW_INSTANCES).where(WORKFLOW_INSTANCES.ID.eq(id)));
    }

    public List<WorkflowInstance> listInstances() {
        return dsl.select(WORKFLOW_INSTANCES.ID, WORKFLOW_INSTANCES.DEFINITION_ID, WORKFLOW_INSTANCES.BUSINESS_KEY, WORKFLOW_INSTANCES.STATUS, WORKFLOW_INSTANCES.CURRENT_NODE_KEY, WORKFLOW_INSTANCES.CONTEXT_JSON, WORKFLOW_INSTANCES.STARTED_BY, WORKFLOW_INSTANCES.STARTED_AT, WORKFLOW_INSTANCES.UPDATED_AT)
                .from(WORKFLOW_INSTANCES)
                .orderBy(WORKFLOW_INSTANCES.UPDATED_AT.desc())
                .fetch(this::mapInstance);
    }

    public void insertAudit(AuditEntry a) {
        dsl.insertInto(AUDIT_LOGS)
                .columns(AUDIT_LOGS.ID, AUDIT_LOGS.INSTANCE_ID, AUDIT_LOGS.USER_ID, AUDIT_LOGS.ACTION, AUDIT_LOGS.FROM_NODE, AUDIT_LOGS.TO_NODE, AUDIT_LOGS.PAYLOAD_JSON, AUDIT_LOGS.SIGNATURE_PLACEHOLDER, AUDIT_LOGS.CREATED_AT)
                .values(
                        a.id(), a.instanceId(), a.userId(), a.action(), a.fromNode(), a.toNode(),
                        a.payloadJson() == null ? null : JSONB.valueOf(a.payloadJson()),
                        a.signaturePlaceholder(), toOdt(a.createdAt())
                )
                .execute();
    }

    public List<AuditEntry> auditsFor(UUID instanceId) {
        return dsl.select(AUDIT_LOGS.ID, AUDIT_LOGS.INSTANCE_ID, AUDIT_LOGS.USER_ID, AUDIT_LOGS.ACTION, AUDIT_LOGS.FROM_NODE, AUDIT_LOGS.TO_NODE, AUDIT_LOGS.PAYLOAD_JSON, AUDIT_LOGS.SIGNATURE_PLACEHOLDER, AUDIT_LOGS.CREATED_AT)
                .from(AUDIT_LOGS)
                .where(AUDIT_LOGS.INSTANCE_ID.eq(instanceId))
                .orderBy(AUDIT_LOGS.CREATED_AT.asc())
                .fetch(r -> new AuditEntry(
                        r.get(AUDIT_LOGS.ID), r.get(AUDIT_LOGS.INSTANCE_ID), r.get(AUDIT_LOGS.USER_ID), r.get(AUDIT_LOGS.ACTION),
                        r.get(AUDIT_LOGS.FROM_NODE), r.get(AUDIT_LOGS.TO_NODE), jsonb(r.get(AUDIT_LOGS.PAYLOAD_JSON)), r.get(AUDIT_LOGS.SIGNATURE_PLACEHOLDER),
                        toInstant(r.get(AUDIT_LOGS.CREATED_AT))
                ));
    }

    public void insertForm(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy) {
        dsl.insertInto(FORM_DOCUMENTS)
                .columns(FORM_DOCUMENTS.ID, FORM_DOCUMENTS.INSTANCE_ID, FORM_DOCUMENTS.FORM_KEY, FORM_DOCUMENTS.NODE_KEY, FORM_DOCUMENTS.PAYLOAD_JSON, FORM_DOCUMENTS.CREATED_BY)
                .values(id, instanceId, formKey, nodeKey, JSONB.valueOf(payloadJson), createdBy)
                .execute();
    }

    public void insertInspection(UUID id, UUID instanceId, String nodeKey, String result, String notes, UUID recordedBy) {
        dsl.insertInto(INSPECTION_RECORDS)
                .columns(INSPECTION_RECORDS.ID, INSPECTION_RECORDS.INSTANCE_ID, INSPECTION_RECORDS.NODE_KEY, INSPECTION_RECORDS.RESULT, INSPECTION_RECORDS.NOTES, INSPECTION_RECORDS.RECORDED_BY)
                .values(id, instanceId, nodeKey, result, notes, recordedBy)
                .execute();
    }

    public void insertDocument(DocumentEntry d) {
        dsl.insertInto(DOCUMENTS)
                .columns(DOCUMENTS.ID, DOCUMENTS.INSTANCE_ID, DOCUMENTS.NODE_KEY, DOCUMENTS.FILE_NAME, DOCUMENTS.CONTENT_TYPE, DOCUMENTS.STORAGE_KEY, DOCUMENTS.UPLOADED_BY, DOCUMENTS.UPLOADED_AT)
                .values(d.id(), d.instanceId(), d.nodeKey(), d.fileName(), d.contentType(), d.storageKey(), d.uploadedBy(), toOdt(d.uploadedAt()))
                .execute();
    }

    public List<DocumentEntry> documentsFor(UUID instanceId) {
        return dsl.select(DOCUMENTS.ID, DOCUMENTS.INSTANCE_ID, DOCUMENTS.NODE_KEY, DOCUMENTS.FILE_NAME, DOCUMENTS.CONTENT_TYPE, DOCUMENTS.STORAGE_KEY, DOCUMENTS.UPLOADED_BY, DOCUMENTS.UPLOADED_AT)
                .from(DOCUMENTS)
                .where(DOCUMENTS.INSTANCE_ID.eq(instanceId))
                .orderBy(DOCUMENTS.UPLOADED_AT.desc())
                .fetch(r -> new DocumentEntry(
                        r.get(DOCUMENTS.ID), r.get(DOCUMENTS.INSTANCE_ID), r.get(DOCUMENTS.NODE_KEY), r.get(DOCUMENTS.FILE_NAME),
                        r.get(DOCUMENTS.CONTENT_TYPE), r.get(DOCUMENTS.STORAGE_KEY), r.get(DOCUMENTS.UPLOADED_BY),
                        toInstant(r.get(DOCUMENTS.UPLOADED_AT))
                ));
    }

    public Optional<DocumentEntry> findDocument(UUID documentId) {
        return dsl.select(DOCUMENTS.ID, DOCUMENTS.INSTANCE_ID, DOCUMENTS.NODE_KEY, DOCUMENTS.FILE_NAME, DOCUMENTS.CONTENT_TYPE, DOCUMENTS.STORAGE_KEY, DOCUMENTS.UPLOADED_BY, DOCUMENTS.UPLOADED_AT)
                .from(DOCUMENTS)
                .where(DOCUMENTS.ID.eq(documentId))
                .fetchOptional(r -> new DocumentEntry(
                        r.get(DOCUMENTS.ID), r.get(DOCUMENTS.INSTANCE_ID), r.get(DOCUMENTS.NODE_KEY), r.get(DOCUMENTS.FILE_NAME),
                        r.get(DOCUMENTS.CONTENT_TYPE), r.get(DOCUMENTS.STORAGE_KEY), r.get(DOCUMENTS.UPLOADED_BY),
                        toInstant(r.get(DOCUMENTS.UPLOADED_AT))
                ));
    }

    public boolean userParticipated(UUID instanceId, UUID userId) {
        return dsl.fetchExists(
                dsl.selectOne().from(AUDIT_LOGS).where(AUDIT_LOGS.INSTANCE_ID.eq(instanceId).and(AUDIT_LOGS.USER_ID.eq(userId)))
        );
    }

    private WorkflowNode mapNode(org.jooq.Record r) {
        return new WorkflowNode(
                r.get(WORKFLOW_NODES.ID),
                r.get(WORKFLOW_NODES.DEFINITION_ID),
                r.get(WORKFLOW_NODES.NODE_KEY),
                NodeType.parse(r.get(WORKFLOW_NODES.NODE_TYPE)),
                r.get(WORKFLOW_NODES.ROLE_CODE),
                r.get(WORKFLOW_NODES.FORM_KEY),
                r.get(WORKFLOW_NODES.LABEL),
                jsonb(r.get(WORKFLOW_NODES.CONFIG_JSON))
        );
    }

    private WorkflowInstance mapInstance(org.jooq.Record r) {
        return new WorkflowInstance(
                r.get(WORKFLOW_INSTANCES.ID),
                r.get(WORKFLOW_INSTANCES.DEFINITION_ID),
                r.get(WORKFLOW_INSTANCES.BUSINESS_KEY),
                InstanceStatus.parse(r.get(WORKFLOW_INSTANCES.STATUS)),
                r.get(WORKFLOW_INSTANCES.CURRENT_NODE_KEY),
                jsonb(r.get(WORKFLOW_INSTANCES.CONTEXT_JSON)),
                r.get(WORKFLOW_INSTANCES.STARTED_BY),
                toInstant(r.get(WORKFLOW_INSTANCES.STARTED_AT)),
                toInstant(r.get(WORKFLOW_INSTANCES.UPDATED_AT))
        );
    }

    private static String jsonb(JSONB value) {
        return value == null ? null : value.data();
    }

    private static OffsetDateTime toOdt(Instant instant) {
        return instant == null ? AmmsDateTimes.nowOdt() : AmmsDateTimes.toUtcOdt(instant);
    }

    private static Instant toInstant(OffsetDateTime odt) {
        return AmmsDateTimes.toInstant(odt);
    }
}
