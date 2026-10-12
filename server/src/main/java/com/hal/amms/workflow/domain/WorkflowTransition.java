package com.hal.amms.workflow.domain;

import java.util.UUID;

public record WorkflowTransition(
        UUID id,
        UUID definitionId,
        String fromNodeKey,
        String toNodeKey,
        String conditionValue,
        int priority
) {}
