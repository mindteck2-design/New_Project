package com.hal.amms.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ApiDtos {
    private ApiDtos() {}

    public record LoginRequest(String username, String password) {}

    public record UserResponse(UUID id, String username, String displayName, List<String> roles) {}

    public record LoginResponse(String token, UserResponse user) {}

    public record WorkflowSummary(UUID id, String key, String name, int version) {}

    public record NodeView(
            String key,
            String type,
            String label,
            String roleCode,
            String formKey,
            List<String> options
    ) {}

    public record AllowedAction(String type, String value, String label) {}

    public record InstanceView(
            UUID instanceId,
            String workflowKey,
            String workflowName,
            String businessKey,
            String status,
            NodeView currentNode,
            List<AllowedAction> allowedActions,
            Map<String, Object> context,
            Instant startedAt,
            Instant updatedAt
    ) {}

    public record StartInstanceRequest(String businessKey, Map<String, Object> context) {}

    public record TransitionRequest(
            String action,
            String decisionValue,
            Map<String, Object> formPayload,
            String notes,
            String signaturePlaceholder
    ) {}

    public record FormSubmitRequest(String formKey, Map<String, Object> payload) {}

    public record AssignNodeFormRequest(String formKey) {}

    public record WorkflowNodeDraft(
            String key,
            String type,
            String label,
            String roleCode,
            String formKey,
            List<String> options,
            String expression
    ) {}

    public record WorkflowTransitionDraft(
            String from,
            String to,
            String when
    ) {}

    public record CreateWorkflowRequest(
            String key,
            String name,
            Integer version,
            List<WorkflowNodeDraft> nodes,
            List<WorkflowTransitionDraft> transitions
    ) {}

    public record AuditView(
            UUID id,
            String action,
            String fromNode,
            String toNode,
            UUID userId,
            String signaturePlaceholder,
            Instant createdAt
    ) {}

    public record DocumentView(
            UUID id,
            String fileName,
            String contentType,
            String nodeKey,
            Instant uploadedAt
    ) {}

    public record NotificationView(
            UUID id,
            UUID instanceId,
            String targetRole,
            String title,
            String body,
            String actionPath,
            boolean read,
            Instant createdAt
    ) {}

    public record RoleMetric(String key, String label, long value, String hint) {}

    public record RoleAnalyticsView(String primaryRole, List<String> roles, List<RoleMetric> metrics) {}

    public record ErrorResponse(String code, String message, Object details) {}
}
