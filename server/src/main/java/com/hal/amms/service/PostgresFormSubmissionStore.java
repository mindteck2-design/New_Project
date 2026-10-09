package com.hal.amms.service;

import com.hal.amms.dao.WorkflowDao;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
/** Offline / test fallback only — production and local prefer Mongo (ADR-002). */
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "postgres")
public class PostgresFormSubmissionStore implements FormSubmissionStore {

    private final WorkflowDao dao;

    public PostgresFormSubmissionStore(WorkflowDao dao) {
        this.dao = dao;
    }

    @Override
    public void save(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy) {
        dao.insertForm(id, instanceId, formKey, nodeKey, payloadJson, createdBy);
    }
}
