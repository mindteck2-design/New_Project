package com.hal.amms.forms;

import java.util.UUID;

public interface FormSubmissionStore {

    void save(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy);
}
