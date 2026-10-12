package com.hal.amms.workflow.domain;

import java.time.Instant;
import java.util.UUID;

public record WorkflowInstance(
        UUID id,
        UUID definitionId,
        String businessKey,
        String status,
        String currentNodeKey,
        String contextJson,
        UUID startedBy,
        Instant startedAt,
        Instant updatedAt
) {}
