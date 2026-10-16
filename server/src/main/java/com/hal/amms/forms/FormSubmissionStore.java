package com.hal.amms.forms;

import java.util.UUID;
import java.util.Optional;

public interface FormSubmissionStore {

    void save(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy);

    Optional<String> findLatest(UUID instanceId, String nodeKey, String formKey);
}
