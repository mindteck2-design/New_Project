package com.hal.amms.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class Models {
    private Models() {}

    public record UserRecord(
            UUID id,
            String username,
            String passwordHash,
            String displayName,
            boolean active,
            List<String> roles
    ) {}

    public record WorkflowDefinition(
            UUID id,
            String key,
            String name,
            int version,
            boolean active,
            String definitionJson
    ) {}

    public record WorkflowNode(
            UUID id,
            UUID definitionId,
            String nodeKey,
            String nodeType,
            String roleCode,
            String formKey,
            String label,
            String configJson
    ) {}

    public record WorkflowTransition(
            UUID id,
            UUID definitionId,
            String fromNodeKey,
            String toNodeKey,
            String conditionValue,
            int priority
    ) {}

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

    public record DocumentEntry(
            UUID id,
            UUID instanceId,
            String nodeKey,
            String fileName,
            String contentType,
            String storageKey,
            UUID uploadedBy,
            Instant uploadedAt
    ) {}
}
