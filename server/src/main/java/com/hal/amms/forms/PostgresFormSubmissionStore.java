package com.hal.amms.forms;

import com.hal.amms.workflow.WorkflowRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
/** Offline / test fallback only — production and local prefer Mongo (ADR-002). */
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "postgres")
public class PostgresFormSubmissionStore implements FormSubmissionStore {

    private final WorkflowRepository dao;

    public PostgresFormSubmissionStore(WorkflowRepository dao) {
        this.dao = dao;
    }

    @Override
    public void save(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy) {
        dao.insertForm(id, instanceId, formKey, nodeKey, payloadJson, createdBy);
    }
}
