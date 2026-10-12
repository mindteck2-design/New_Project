package com.hal.amms.workflow.domain;

import java.util.UUID;

public record WorkflowDefinition(
        UUID id,
        String key,
        String name,
        int version,
        boolean active,
        String definitionJson
) {}
