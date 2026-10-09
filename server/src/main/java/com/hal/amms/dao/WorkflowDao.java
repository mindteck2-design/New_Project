package com.hal.amms.dao;

import com.hal.amms.model.Models.*;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.db.Tables.*;

@Repository
public class WorkflowDao {

    private final DSLContext dsl;

    public WorkflowDao(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<WorkflowDefinition> listActiveDefinitions() {
        return dsl.select(WD_ID, WD_KEY, WD_NAME, WD_VERSION, WD_ACTIVE, WD_DEFINITION_JSON)
                .from(WORKFLOW_DEFINITIONS)
                .where(WD_ACTIVE.isTrue())
                .orderBy(WD_NAME.asc())
                .fetch(r -> new WorkflowDefinition(
                        r.get(WD_ID), r.get(WD_KEY), r.get(WD_NAME), r.get(WD_VERSION),
                        Boolean.TRUE.equals(r.get(WD_ACTIVE)), jsonb(r.get(WD_DEFINITION_JSON))
                ));
    }

    public Optional<WorkflowDefinition> findDefinitionByKey(String key) {
        return dsl.select(WD_ID, WD_KEY, WD_NAME, WD_VERSION, WD_ACTIVE, WD_DEFINITION_JSON)
                .from(WORKFLOW_DEFINITIONS)
                .where(WD_KEY.eq(key).and(WD_ACTIVE.isTrue()))
                .fetchOptional(r -> new WorkflowDefinition(
                        r.get(WD_ID), r.get(WD_KEY), r.get(WD_NAME), r.get(WD_VERSION),
                        Boolean.TRUE.equals(r.get(WD_ACTIVE)), jsonb(r.get(WD_DEFINITION_JSON))
                ));
    }

    public Optional<WorkflowDefinition> findDefinitionById(UUID id) {
        return dsl.select(WD_ID, WD_KEY, WD_NAME, WD_VERSION, WD_ACTIVE, WD_DEFINITION_JSON)
                .from(WORKFLOW_DEFINITIONS)
                .where(WD_ID.eq(id))
                .fetchOptional(r -> new WorkflowDefinition(
                        r.get(WD_ID), r.get(WD_KEY), r.get(WD_NAME), r.get(WD_VERSION),
                        Boolean.TRUE.equals(r.get(WD_ACTIVE)), jsonb(r.get(WD_DEFINITION_JSON))
                ));
    }

    public boolean definitionExists(String key) {
        return dsl.fetchExists(dsl.selectOne().from(WORKFLOW_DEFINITIONS).where(WD_KEY.eq(key)));
    }

    public void upsertDefinition(UUID id, String key, String name, int version, String definitionJson) {
        JSONB json = JSONB.valueOf(definitionJson);
        int updated = dsl.update(WORKFLOW_DEFINITIONS)
                .set(WD_NAME, name)
                .set(WD_VERSION, version)
                .set(WD_ACTIVE, true)
                .set(WD_DEFINITION_JSON, json)
                .where(WD_KEY.eq(key))
                .execute();
        if (updated == 0) {
            dsl.insertInto(WORKFLOW_DEFINITIONS)
                    .columns(WD_ID, WD_KEY, WD_NAME, WD_VERSION, WD_ACTIVE, WD_DEFINITION_JSON)
                    .values(id, key, name, version, true, json)
                    .execute();
        }
        UUID defId = dsl.select(WD_ID).from(WORKFLOW_DEFINITIONS).where(WD_KEY.eq(key)).fetchOne(WD_ID);
        dsl.deleteFrom(WORKFLOW_TRANSITIONS).where(WT_DEFINITION_ID.eq(defId)).execute();
        dsl.deleteFrom(WORKFLOW_NODES).where(WN_DEFINITION_ID.eq(defId)).execute();
    }

    public void insertNode(WorkflowNode node) {
        dsl.insertInto(WORKFLOW_NODES)
                .columns(WN_ID, WN_DEFINITION_ID, WN_NODE_KEY, WN_NODE_TYPE, WN_ROLE_CODE, WN_FORM_KEY, WN_LABEL, WN_CONFIG_JSON)
                .values(
                        node.id(), node.definitionId(), node.nodeKey(), node.nodeType(),
                        node.roleCode(), node.formKey(), node.label(),
                        node.configJson() == null ? null : JSONB.valueOf(node.configJson())
                )
                .execute();
    }

    public void insertTransition(WorkflowTransition t) {
        dsl.insertInto(WORKFLOW_TRANSITIONS)
                .columns(WT_ID, WT_DEFINITION_ID, WT_FROM, WT_TO, WT_CONDITION, WT_PRIORITY)
                .values(t.id(), t.definitionId(), t.fromNodeKey(), t.toNodeKey(), t.conditionValue(), t.priority())
                .execute();
    }

    public UUID definitionIdByKey(String key) {
        return dsl.select(WD_ID).from(WORKFLOW_DEFINITIONS).where(WD_KEY.eq(key)).fetchOne(WD_ID);
    }

    public List<WorkflowNode> nodesFor(UUID definitionId) {
        return dsl.select(WN_ID, WN_DEFINITION_ID, WN_NODE_KEY, WN_NODE_TYPE, WN_ROLE_CODE, WN_FORM_KEY, WN_LABEL, WN_CONFIG_JSON)
                .from(WORKFLOW_NODES)
                .where(WN_DEFINITION_ID.eq(definitionId))
                .fetch(r -> new WorkflowNode(
                        r.get(WN_ID), r.get(WN_DEFINITION_ID), r.get(WN_NODE_KEY), r.get(WN_NODE_TYPE),
                        r.get(WN_ROLE_CODE), r.get(WN_FORM_KEY), r.get(WN_LABEL), jsonb(r.get(WN_CONFIG_JSON))
                ));
    }

    public Optional<WorkflowNode> findNode(UUID definitionId, String nodeKey) {
        return dsl.select(WN_ID, WN_DEFINITION_ID, WN_NODE_KEY, WN_NODE_TYPE, WN_ROLE_CODE, WN_FORM_KEY, WN_LABEL, WN_CONFIG_JSON)
                .from(WORKFLOW_NODES)
                .where(WN_DEFINITION_ID.eq(definitionId).and(WN_NODE_KEY.eq(nodeKey)))
                .fetchOptional(r -> new WorkflowNode(
                        r.get(WN_ID), r.get(WN_DEFINITION_ID), r.get(WN_NODE_KEY), r.get(WN_NODE_TYPE),
                        r.get(WN_ROLE_CODE), r.get(WN_FORM_KEY), r.get(WN_LABEL), jsonb(r.get(WN_CONFIG_JSON))
                ));
    }

    public List<WorkflowTransition> transitionsFrom(UUID definitionId, String fromNodeKey) {
        return dsl.select(WT_ID, WT_DEFINITION_ID, WT_FROM, WT_TO, WT_CONDITION, WT_PRIORITY)
                .from(WORKFLOW_TRANSITIONS)
                .where(WT_DEFINITION_ID.eq(definitionId).and(WT_FROM.eq(fromNodeKey)))
                .orderBy(WT_PRIORITY.asc())
                .fetch(r -> new WorkflowTransition(
                        r.get(WT_ID), r.get(WT_DEFINITION_ID), r.get(WT_FROM), r.get(WT_TO),
                        r.get(WT_CONDITION), r.get(WT_PRIORITY)
                ));
    }

    public void insertInstance(WorkflowInstance i) {
        dsl.insertInto(WORKFLOW_INSTANCES)
                .columns(WI_ID, WI_DEFINITION_ID, WI_BUSINESS_KEY, WI_STATUS, WI_CURRENT_NODE, WI_CONTEXT, WI_STARTED_BY, WI_STARTED_AT, WI_UPDATED_AT)
                .values(
                        i.id(), i.definitionId(), i.businessKey(), i.status(), i.currentNodeKey(),
                        JSONB.valueOf(i.contextJson() == null ? "{}" : i.contextJson()),
                        i.startedBy(), toOdt(i.startedAt()), toOdt(i.updatedAt())
                )
                .execute();
    }

    public void updateInstance(WorkflowInstance i) {
        dsl.update(WORKFLOW_INSTANCES)
                .set(WI_STATUS, i.status())
                .set(WI_CURRENT_NODE, i.currentNodeKey())
                .set(WI_CONTEXT, JSONB.valueOf(i.contextJson() == null ? "{}" : i.contextJson()))
                .set(WI_UPDATED_AT, toOdt(i.updatedAt()))
                .where(WI_ID.eq(i.id()))
                .execute();
    }

    public Optional<WorkflowInstance> findInstance(UUID id) {
        return dsl.select(WI_ID, WI_DEFINITION_ID, WI_BUSINESS_KEY, WI_STATUS, WI_CURRENT_NODE, WI_CONTEXT, WI_STARTED_BY, WI_STARTED_AT, WI_UPDATED_AT)
                .from(WORKFLOW_INSTANCES)
                .where(WI_ID.eq(id))
                .fetchOptional(this::mapInstance);
    }

    public boolean instanceExists(UUID id) {
        return dsl.fetchExists(dsl.selectOne().from(WORKFLOW_INSTANCES).where(WI_ID.eq(id)));
    }

    public List<WorkflowInstance> listInstances() {
        return dsl.select(WI_ID, WI_DEFINITION_ID, WI_BUSINESS_KEY, WI_STATUS, WI_CURRENT_NODE, WI_CONTEXT, WI_STARTED_BY, WI_STARTED_AT, WI_UPDATED_AT)
                .from(WORKFLOW_INSTANCES)
                .orderBy(WI_UPDATED_AT.desc())
                .fetch(this::mapInstance);
    }

    public void insertAudit(AuditEntry a) {
        dsl.insertInto(AUDIT_LOGS)
                .columns(AL_ID, AL_INSTANCE_ID, AL_USER_ID, AL_ACTION, AL_FROM, AL_TO, AL_PAYLOAD, AL_SIGNATURE, AL_CREATED_AT)
                .values(
                        a.id(), a.instanceId(), a.userId(), a.action(), a.fromNode(), a.toNode(),
                        a.payloadJson() == null ? null : JSONB.valueOf(a.payloadJson()),
                        a.signaturePlaceholder(), toOdt(a.createdAt())
                )
                .execute();
    }

    public List<AuditEntry> auditsFor(UUID instanceId) {
        return dsl.select(AL_ID, AL_INSTANCE_ID, AL_USER_ID, AL_ACTION, AL_FROM, AL_TO, AL_PAYLOAD, AL_SIGNATURE, AL_CREATED_AT)
                .from(AUDIT_LOGS)
                .where(AL_INSTANCE_ID.eq(instanceId))
                .orderBy(AL_CREATED_AT.asc())
                .fetch(r -> new AuditEntry(
                        r.get(AL_ID), r.get(AL_INSTANCE_ID), r.get(AL_USER_ID), r.get(AL_ACTION),
                        r.get(AL_FROM), r.get(AL_TO), jsonb(r.get(AL_PAYLOAD)), r.get(AL_SIGNATURE),
                        toInstant(r.get(AL_CREATED_AT))
                ));
    }

    public void insertForm(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy) {
        dsl.insertInto(FORM_DOCUMENTS)
                .columns(FD_ID, FD_INSTANCE_ID, FD_FORM_KEY, FD_NODE_KEY, FD_PAYLOAD, FD_CREATED_BY)
                .values(id, instanceId, formKey, nodeKey, JSONB.valueOf(payloadJson), createdBy)
                .execute();
    }

    public void insertInspection(UUID id, UUID instanceId, String nodeKey, String result, String notes, UUID recordedBy) {
        dsl.insertInto(INSPECTION_RECORDS)
                .columns(IR_ID, IR_INSTANCE_ID, IR_NODE_KEY, IR_RESULT, IR_NOTES, IR_RECORDED_BY)
                .values(id, instanceId, nodeKey, result, notes, recordedBy)
                .execute();
    }

    public void insertDocument(DocumentEntry d) {
        dsl.insertInto(DOCUMENTS)
                .columns(DOC_ID, DOC_INSTANCE_ID, DOC_NODE_KEY, DOC_FILE_NAME, DOC_CONTENT_TYPE, DOC_STORAGE_KEY, DOC_UPLOADED_BY, DOC_UPLOADED_AT)
                .values(d.id(), d.instanceId(), d.nodeKey(), d.fileName(), d.contentType(), d.storageKey(), d.uploadedBy(), toOdt(d.uploadedAt()))
                .execute();
    }

    public List<DocumentEntry> documentsFor(UUID instanceId) {
        return dsl.select(DOC_ID, DOC_INSTANCE_ID, DOC_NODE_KEY, DOC_FILE_NAME, DOC_CONTENT_TYPE, DOC_STORAGE_KEY, DOC_UPLOADED_BY, DOC_UPLOADED_AT)
                .from(DOCUMENTS)
                .where(DOC_INSTANCE_ID.eq(instanceId))
                .orderBy(DOC_UPLOADED_AT.desc())
                .fetch(r -> new DocumentEntry(
                        r.get(DOC_ID), r.get(DOC_INSTANCE_ID), r.get(DOC_NODE_KEY), r.get(DOC_FILE_NAME),
                        r.get(DOC_CONTENT_TYPE), r.get(DOC_STORAGE_KEY), r.get(DOC_UPLOADED_BY),
                        toInstant(r.get(DOC_UPLOADED_AT))
                ));
    }

    public Optional<DocumentEntry> findDocument(UUID documentId) {
        return dsl.select(DOC_ID, DOC_INSTANCE_ID, DOC_NODE_KEY, DOC_FILE_NAME, DOC_CONTENT_TYPE, DOC_STORAGE_KEY, DOC_UPLOADED_BY, DOC_UPLOADED_AT)
                .from(DOCUMENTS)
                .where(DOC_ID.eq(documentId))
                .fetchOptional(r -> new DocumentEntry(
                        r.get(DOC_ID), r.get(DOC_INSTANCE_ID), r.get(DOC_NODE_KEY), r.get(DOC_FILE_NAME),
                        r.get(DOC_CONTENT_TYPE), r.get(DOC_STORAGE_KEY), r.get(DOC_UPLOADED_BY),
                        toInstant(r.get(DOC_UPLOADED_AT))
                ));
    }

    public boolean userParticipated(UUID instanceId, UUID userId) {
        return dsl.fetchExists(
                dsl.selectOne().from(AUDIT_LOGS).where(AL_INSTANCE_ID.eq(instanceId).and(AL_USER_ID.eq(userId)))
        );
    }

    private WorkflowInstance mapInstance(org.jooq.Record r) {
        return new WorkflowInstance(
                r.get(WI_ID), r.get(WI_DEFINITION_ID), r.get(WI_BUSINESS_KEY), r.get(WI_STATUS),
                r.get(WI_CURRENT_NODE), jsonb(r.get(WI_CONTEXT)), r.get(WI_STARTED_BY),
                toInstant(r.get(WI_STARTED_AT)), toInstant(r.get(WI_UPDATED_AT))
        );
    }

    private static String jsonb(JSONB value) {
        return value == null ? null : value.data();
    }

    private static OffsetDateTime toOdt(Instant instant) {
        return instant == null ? OffsetDateTime.now(ZoneOffset.UTC) : instant.atOffset(ZoneOffset.UTC);
    }

    private static Instant toInstant(OffsetDateTime odt) {
        return odt == null ? null : odt.toInstant();
    }
}
