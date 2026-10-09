package com.hal.amms.db;

import org.jooq.Field;
import org.jooq.JSONB;
import org.jooq.Record;
import org.jooq.Table;
import org.jooq.impl.DSL;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Flyway-aligned table/field definitions for jOOQ DSL (no JPA). */
public final class Tables {
    private Tables() {}

    public static final Table<Record> USERS = DSL.table(DSL.name("users"));
    public static final Field<UUID> USERS_ID = DSL.field(DSL.name("users", "id"), UUID.class);
    public static final Field<String> USERS_USERNAME = DSL.field(DSL.name("users", "username"), String.class);
    public static final Field<String> USERS_PASSWORD_HASH = DSL.field(DSL.name("users", "password_hash"), String.class);
    public static final Field<String> USERS_DISPLAY_NAME = DSL.field(DSL.name("users", "display_name"), String.class);
    public static final Field<Boolean> USERS_ACTIVE = DSL.field(DSL.name("users", "active"), Boolean.class);
    public static final Field<OffsetDateTime> USERS_CREATED_AT = DSL.field(DSL.name("users", "created_at"), OffsetDateTime.class);

    public static final Table<Record> ROLES = DSL.table(DSL.name("roles"));
    public static final Field<UUID> ROLES_ID = DSL.field(DSL.name("roles", "id"), UUID.class);
    public static final Field<String> ROLES_CODE = DSL.field(DSL.name("roles", "code"), String.class);
    public static final Field<String> ROLES_NAME = DSL.field(DSL.name("roles", "name"), String.class);

    public static final Table<Record> USER_ROLES = DSL.table(DSL.name("user_roles"));
    public static final Field<UUID> USER_ROLES_USER_ID = DSL.field(DSL.name("user_roles", "user_id"), UUID.class);
    public static final Field<UUID> USER_ROLES_ROLE_ID = DSL.field(DSL.name("user_roles", "role_id"), UUID.class);

    public static final Table<Record> WORKFLOW_DEFINITIONS = DSL.table(DSL.name("workflow_definitions"));
    public static final Field<UUID> WD_ID = DSL.field(DSL.name("workflow_definitions", "id"), UUID.class);
    public static final Field<String> WD_KEY = DSL.field(DSL.name("workflow_definitions", "key"), String.class);
    public static final Field<String> WD_NAME = DSL.field(DSL.name("workflow_definitions", "name"), String.class);
    public static final Field<Integer> WD_VERSION = DSL.field(DSL.name("workflow_definitions", "version"), Integer.class);
    public static final Field<Boolean> WD_ACTIVE = DSL.field(DSL.name("workflow_definitions", "active"), Boolean.class);
    public static final Field<JSONB> WD_DEFINITION_JSON = DSL.field(DSL.name("workflow_definitions", "definition_json"), JSONB.class);
    public static final Field<OffsetDateTime> WD_CREATED_AT = DSL.field(DSL.name("workflow_definitions", "created_at"), OffsetDateTime.class);

    public static final Table<Record> WORKFLOW_NODES = DSL.table(DSL.name("workflow_nodes"));
    public static final Field<UUID> WN_ID = DSL.field(DSL.name("workflow_nodes", "id"), UUID.class);
    public static final Field<UUID> WN_DEFINITION_ID = DSL.field(DSL.name("workflow_nodes", "definition_id"), UUID.class);
    public static final Field<String> WN_NODE_KEY = DSL.field(DSL.name("workflow_nodes", "node_key"), String.class);
    public static final Field<String> WN_NODE_TYPE = DSL.field(DSL.name("workflow_nodes", "node_type"), String.class);
    public static final Field<String> WN_ROLE_CODE = DSL.field(DSL.name("workflow_nodes", "role_code"), String.class);
    public static final Field<String> WN_FORM_KEY = DSL.field(DSL.name("workflow_nodes", "form_key"), String.class);
    public static final Field<String> WN_LABEL = DSL.field(DSL.name("workflow_nodes", "label"), String.class);
    public static final Field<JSONB> WN_CONFIG_JSON = DSL.field(DSL.name("workflow_nodes", "config_json"), JSONB.class);

    public static final Table<Record> WORKFLOW_TRANSITIONS = DSL.table(DSL.name("workflow_transitions"));
    public static final Field<UUID> WT_ID = DSL.field(DSL.name("workflow_transitions", "id"), UUID.class);
    public static final Field<UUID> WT_DEFINITION_ID = DSL.field(DSL.name("workflow_transitions", "definition_id"), UUID.class);
    public static final Field<String> WT_FROM = DSL.field(DSL.name("workflow_transitions", "from_node_key"), String.class);
    public static final Field<String> WT_TO = DSL.field(DSL.name("workflow_transitions", "to_node_key"), String.class);
    public static final Field<String> WT_CONDITION = DSL.field(DSL.name("workflow_transitions", "condition_value"), String.class);
    public static final Field<Integer> WT_PRIORITY = DSL.field(DSL.name("workflow_transitions", "priority"), Integer.class);

    public static final Table<Record> WORKFLOW_INSTANCES = DSL.table(DSL.name("workflow_instances"));
    public static final Field<UUID> WI_ID = DSL.field(DSL.name("workflow_instances", "id"), UUID.class);
    public static final Field<UUID> WI_DEFINITION_ID = DSL.field(DSL.name("workflow_instances", "definition_id"), UUID.class);
    public static final Field<String> WI_BUSINESS_KEY = DSL.field(DSL.name("workflow_instances", "business_key"), String.class);
    public static final Field<String> WI_STATUS = DSL.field(DSL.name("workflow_instances", "status"), String.class);
    public static final Field<String> WI_CURRENT_NODE = DSL.field(DSL.name("workflow_instances", "current_node_key"), String.class);
    public static final Field<JSONB> WI_CONTEXT = DSL.field(DSL.name("workflow_instances", "context_json"), JSONB.class);
    public static final Field<UUID> WI_STARTED_BY = DSL.field(DSL.name("workflow_instances", "started_by"), UUID.class);
    public static final Field<OffsetDateTime> WI_STARTED_AT = DSL.field(DSL.name("workflow_instances", "started_at"), OffsetDateTime.class);
    public static final Field<OffsetDateTime> WI_UPDATED_AT = DSL.field(DSL.name("workflow_instances", "updated_at"), OffsetDateTime.class);

    public static final Table<Record> AUDIT_LOGS = DSL.table(DSL.name("audit_logs"));
    public static final Field<UUID> AL_ID = DSL.field(DSL.name("audit_logs", "id"), UUID.class);
    public static final Field<UUID> AL_INSTANCE_ID = DSL.field(DSL.name("audit_logs", "instance_id"), UUID.class);
    public static final Field<UUID> AL_USER_ID = DSL.field(DSL.name("audit_logs", "user_id"), UUID.class);
    public static final Field<String> AL_ACTION = DSL.field(DSL.name("audit_logs", "action"), String.class);
    public static final Field<String> AL_FROM = DSL.field(DSL.name("audit_logs", "from_node"), String.class);
    public static final Field<String> AL_TO = DSL.field(DSL.name("audit_logs", "to_node"), String.class);
    public static final Field<JSONB> AL_PAYLOAD = DSL.field(DSL.name("audit_logs", "payload_json"), JSONB.class);
    public static final Field<String> AL_SIGNATURE = DSL.field(DSL.name("audit_logs", "signature_placeholder"), String.class);
    public static final Field<OffsetDateTime> AL_CREATED_AT = DSL.field(DSL.name("audit_logs", "created_at"), OffsetDateTime.class);

    public static final Table<Record> FORM_DOCUMENTS = DSL.table(DSL.name("form_documents"));
    public static final Field<UUID> FD_ID = DSL.field(DSL.name("form_documents", "id"), UUID.class);
    public static final Field<UUID> FD_INSTANCE_ID = DSL.field(DSL.name("form_documents", "instance_id"), UUID.class);
    public static final Field<String> FD_FORM_KEY = DSL.field(DSL.name("form_documents", "form_key"), String.class);
    public static final Field<String> FD_NODE_KEY = DSL.field(DSL.name("form_documents", "node_key"), String.class);
    public static final Field<JSONB> FD_PAYLOAD = DSL.field(DSL.name("form_documents", "payload_json"), JSONB.class);
    public static final Field<UUID> FD_CREATED_BY = DSL.field(DSL.name("form_documents", "created_by"), UUID.class);
    public static final Field<OffsetDateTime> FD_CREATED_AT = DSL.field(DSL.name("form_documents", "created_at"), OffsetDateTime.class);

    public static final Table<Record> DOCUMENTS = DSL.table(DSL.name("documents"));
    public static final Field<UUID> DOC_ID = DSL.field(DSL.name("documents", "id"), UUID.class);
    public static final Field<UUID> DOC_INSTANCE_ID = DSL.field(DSL.name("documents", "instance_id"), UUID.class);
    public static final Field<String> DOC_NODE_KEY = DSL.field(DSL.name("documents", "node_key"), String.class);
    public static final Field<String> DOC_FILE_NAME = DSL.field(DSL.name("documents", "file_name"), String.class);
    public static final Field<String> DOC_CONTENT_TYPE = DSL.field(DSL.name("documents", "content_type"), String.class);
    public static final Field<String> DOC_STORAGE_KEY = DSL.field(DSL.name("documents", "storage_key"), String.class);
    public static final Field<UUID> DOC_UPLOADED_BY = DSL.field(DSL.name("documents", "uploaded_by"), UUID.class);
    public static final Field<OffsetDateTime> DOC_UPLOADED_AT = DSL.field(DSL.name("documents", "uploaded_at"), OffsetDateTime.class);

    public static final Table<Record> INSPECTION_RECORDS = DSL.table(DSL.name("inspection_records"));
    public static final Field<UUID> IR_ID = DSL.field(DSL.name("inspection_records", "id"), UUID.class);
    public static final Field<UUID> IR_INSTANCE_ID = DSL.field(DSL.name("inspection_records", "instance_id"), UUID.class);
    public static final Field<String> IR_NODE_KEY = DSL.field(DSL.name("inspection_records", "node_key"), String.class);
    public static final Field<String> IR_RESULT = DSL.field(DSL.name("inspection_records", "result"), String.class);
    public static final Field<String> IR_NOTES = DSL.field(DSL.name("inspection_records", "notes"), String.class);
    public static final Field<UUID> IR_RECORDED_BY = DSL.field(DSL.name("inspection_records", "recorded_by"), UUID.class);
    public static final Field<OffsetDateTime> IR_RECORDED_AT = DSL.field(DSL.name("inspection_records", "recorded_at"), OffsetDateTime.class);

    public static final Table<Record> WORKFLOW_NOTIFICATIONS = DSL.table(DSL.name("workflow_notifications"));
    public static final Field<UUID> WFN_ID = DSL.field(DSL.name("workflow_notifications", "id"), UUID.class);
    public static final Field<UUID> WFN_INSTANCE_ID = DSL.field(DSL.name("workflow_notifications", "instance_id"), UUID.class);
    public static final Field<String> WFN_TARGET_ROLE = DSL.field(DSL.name("workflow_notifications", "target_role"), String.class);
    public static final Field<String> WFN_TITLE = DSL.field(DSL.name("workflow_notifications", "title"), String.class);
    public static final Field<String> WFN_BODY = DSL.field(DSL.name("workflow_notifications", "body"), String.class);
    public static final Field<String> WFN_ACTION_PATH = DSL.field(DSL.name("workflow_notifications", "action_path"), String.class);
    public static final Field<OffsetDateTime> WFN_CREATED_AT = DSL.field(DSL.name("workflow_notifications", "created_at"), OffsetDateTime.class);

    public static final Table<Record> NOTIFICATION_READS = DSL.table(DSL.name("notification_reads"));
    public static final Field<UUID> NR_NOTIFICATION_ID = DSL.field(DSL.name("notification_reads", "notification_id"), UUID.class);
    public static final Field<UUID> NR_USER_ID = DSL.field(DSL.name("notification_reads", "user_id"), UUID.class);
    public static final Field<OffsetDateTime> NR_READ_AT = DSL.field(DSL.name("notification_reads", "read_at"), OffsetDateTime.class);
}
