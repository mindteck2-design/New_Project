package com.hal.amms.workflow.domain;

import java.util.UUID;

public record WorkflowNode(
        UUID id,
        UUID definitionId,
        String nodeKey,
        NodeType nodeType,
        String roleCode,
        String formKey,
        String label,
        String configJson
) {}
