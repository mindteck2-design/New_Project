package com.hal.amms.workflow.domain;

import java.time.Instant;
import java.util.UUID;

public record AuditEntry(
        UUID id,
        UUID instanceId,
        UUID userId,
        String action,
        String fromNode,
        String toNode,
        String payloadJson,
        String signaturePlaceholder,
        Instant createdAt
) {}
