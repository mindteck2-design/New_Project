package com.hal.amms.workflow;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hal.amms.dao.WorkflowDao;
import com.hal.amms.model.Models.*;
import com.hal.amms.security.UserPrincipal;
import com.hal.amms.service.AttachmentStorageService;
import com.hal.amms.service.FormSubmissionStore;
import com.hal.amms.service.NotificationService;
import com.hal.amms.service.WorkPackageService;
import com.hal.amms.web.ApiException;
import com.hal.amms.web.dto.ApiDtos.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class WorkflowService {

    private final WorkflowDao dao;
    private final DecisionEngine decisionEngine;
    private final ObjectMapper mapper;
    private final AttachmentStorageService attachments;
    private final FormSubmissionStore formStore;
    private final NotificationService notifications;
    private final ObjectProvider<WorkPackageService> workPackages;

    public WorkflowService(
            WorkflowDao dao,
            DecisionEngine decisionEngine,
            ObjectMapper mapper,
            AttachmentStorageService attachments,
            FormSubmissionStore formStore,
            NotificationService notifications,
            ObjectProvider<WorkPackageService> workPackages
    ) {
        this.dao = dao;
        this.decisionEngine = decisionEngine;
        this.mapper = mapper;
        this.attachments = attachments;
        this.formStore = formStore;
        this.notifications = notifications;
        this.workPackages = workPackages;
    }

    public List<WorkflowSummary> listWorkflows() {
        return dao.listActiveDefinitions().stream()
                .map(d -> new WorkflowSummary(d.id(), d.key(), d.name(), d.version()))
                .toList();
    }

    public Map<String, Object> getDefinition(String key) {
        WorkflowDefinition def = dao.findDefinitionByKey(key)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + key));
        try {
            Map<String, Object> raw = mapper.readValue(def.definitionJson(), new TypeReference<>() {});
            // Prefer live node rows (formKey may have been assigned after seed).
            List<Map<String, Object>> liveNodes = dao.nodesFor(def.id()).stream()
                    .map(n -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("key", n.nodeKey());
                        m.put("type", n.nodeType());
                        m.put("label", n.label());
                        m.put("roleCode", n.roleCode());
                        m.put("formKey", n.formKey());
                        if (n.configJson() != null && !n.configJson().isBlank()) {
                            try {
                                Map<String, Object> cfg = mapper.readValue(n.configJson(), new TypeReference<>() {});
                                if (cfg.containsKey("options")) {
                                    m.put("options", cfg.get("options"));
                                }
                                if (cfg.containsKey("expression")) {
                                    m.put("expression", cfg.get("expression"));
                                }
                            } catch (Exception ignored) {
                                // keep node without config extras
                            }
                        }
                        return m;
                    })
                    .toList();
            raw.put("nodes", liveNodes);
            raw.put("id", def.id().toString());
            raw.put("version", def.version());
            return raw;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid definition JSON");
        }
    }

    /**
     * Admin creates a workflow definition from master forms + role assignments (no code deploy).
     */
    @Transactional
    public WorkflowSummary createWorkflow(CreateWorkflowRequest request) {
        if (request == null || request.key() == null || request.key().isBlank()) {
            throw ApiException.badRequest("workflow key is required");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("workflow name is required");
        }
        if (request.nodes() == null || request.nodes().isEmpty()) {
            throw ApiException.badRequest("at least one node is required");
        }
        if (request.transitions() == null || request.transitions().isEmpty()) {
            throw ApiException.badRequest("at least one transition is required");
        }
        String key = request.key().trim().toLowerCase();
        if (!key.matches("^[a-z][a-z0-9-]{1,62}$")) {
            throw ApiException.badRequest("key must be lowercase kebab-case (2–63 chars)");
        }
        if (dao.definitionExists(key)) {
            throw ApiException.conflict("Workflow already exists: " + key);
        }
        boolean hasStart = request.nodes().stream().anyMatch(n -> "START".equalsIgnoreCase(n.type()));
        boolean hasEnd = request.nodes().stream().anyMatch(n -> "END".equalsIgnoreCase(n.type()));
        if (!hasStart || !hasEnd) {
            throw ApiException.badRequest("workflow must include START and END nodes");
        }
        for (WorkflowNodeDraft n : request.nodes()) {
            if (n.key() == null || n.key().isBlank() || n.type() == null || n.label() == null) {
                throw ApiException.badRequest("each node needs key, type, and label");
            }
            if ("TASK".equalsIgnoreCase(n.type()) && (n.formKey() == null || n.formKey().isBlank())) {
                throw ApiException.badRequest("TASK node " + n.key() + " must select a master form");
            }
            if (n.roleCode() == null || n.roleCode().isBlank()) {
                throw ApiException.badRequest("node " + n.key() + " must have a roleCode");
            }
        }

        int version = request.version() == null ? 1 : request.version();
        try {
            Map<String, Object> definition = new LinkedHashMap<>();
            definition.put("key", key);
            definition.put("name", request.name().trim());
            definition.put("version", version);
            definition.put("source", "admin-ui");
            List<Map<String, Object>> nodeJson = new ArrayList<>();
            for (WorkflowNodeDraft n : request.nodes()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("key", n.key().trim());
                m.put("type", n.type().trim().toUpperCase());
                m.put("label", n.label().trim());
                m.put("roleCode", n.roleCode().trim().toUpperCase());
                if (n.formKey() != null && !n.formKey().isBlank()) {
                    m.put("formKey", n.formKey().trim().toLowerCase());
                }
                if (n.options() != null && !n.options().isEmpty()) {
                    m.put("options", n.options());
                }
                if (n.expression() != null && !n.expression().isBlank()) {
                    m.put("expression", n.expression().trim());
                }
                nodeJson.add(m);
            }
            definition.put("nodes", nodeJson);
            List<Map<String, Object>> transitionJson = new ArrayList<>();
            for (WorkflowTransitionDraft t : request.transitions()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("from", t.from());
                m.put("to", t.to());
                if (t.when() != null && !t.when().isBlank()) {
                    m.put("when", t.when());
                }
                transitionJson.add(m);
            }
            definition.put("transitions", transitionJson);

            String json = mapper.writeValueAsString(definition);
            UUID defId = UUID.randomUUID();
            dao.upsertDefinition(defId, key, request.name().trim(), version, json);
            defId = dao.definitionIdByKey(key);

            for (WorkflowNodeDraft n : request.nodes()) {
                String config = null;
                if ((n.options() != null && !n.options().isEmpty()) || (n.expression() != null && !n.expression().isBlank())) {
                    Map<String, Object> cfg = new LinkedHashMap<>();
                    if (n.options() != null && !n.options().isEmpty()) {
                        cfg.put("options", n.options());
                    }
                    if (n.expression() != null && !n.expression().isBlank()) {
                        cfg.put("expression", n.expression().trim());
                    }
                    config = mapper.writeValueAsString(cfg);
                }
                dao.insertNode(new WorkflowNode(
                        UUID.randomUUID(),
                        defId,
                        n.key().trim(),
                        n.type().trim().toUpperCase(),
                        n.roleCode().trim().toUpperCase(),
                        n.formKey() == null || n.formKey().isBlank() ? null : n.formKey().trim().toLowerCase(),
                        n.label().trim(),
                        config
                ));
            }
            int priority = 0;
            for (WorkflowTransitionDraft t : request.transitions()) {
                dao.insertTransition(new WorkflowTransition(
                        UUID.randomUUID(),
                        defId,
                        t.from(),
                        t.to(),
                        t.when() == null || t.when().isBlank() ? null : t.when(),
                        priority++
                ));
            }
            return new WorkflowSummary(defId, key, request.name().trim(), version);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Could not create workflow: " + e.getMessage());
        }
    }

    /**
     * Attach a Mongo dynamic form schema to a workflow TASK node.
     * Updates {@code workflow_nodes.form_key} and mirrors into definition JSON.
     */
    @Transactional
    public Map<String, Object> assignNodeForm(String workflowKey, String nodeKey, String formKey) {
        if (formKey == null || formKey.isBlank()) {
            throw ApiException.badRequest("formKey is required");
        }
        String normalizedForm = formKey.trim().toLowerCase();
        WorkflowDefinition def = dao.findDefinitionByKey(workflowKey)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + workflowKey));
        WorkflowNode node = dao.findNode(def.id(), nodeKey)
                .orElseThrow(() -> ApiException.notFound("Node not found: " + nodeKey));
        if (!"TASK".equalsIgnoreCase(node.nodeType())) {
            throw ApiException.badRequest("Only TASK nodes can carry a dynamic form (got " + node.nodeType() + ")");
        }
        try {
            dao.updateNodeFormKey(def.id(), nodeKey, normalizedForm);
        } catch (IllegalArgumentException ex) {
            throw ApiException.notFound(ex.getMessage());
        }
        patchDefinitionFormKey(def.id(), nodeKey, normalizedForm);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("workflowKey", workflowKey);
        out.put("nodeKey", nodeKey);
        out.put("formKey", normalizedForm);
        out.put("label", node.label());
        return out;
    }

    private void patchDefinitionFormKey(UUID definitionId, String nodeKey, String formKey) {
        try {
            String json = dao.definitionJsonById(definitionId);
            JsonNode root = mapper.readTree(json == null ? "{}" : json);
            if (!(root instanceof com.fasterxml.jackson.databind.node.ObjectNode obj) || !obj.has("nodes")) {
                return;
            }
            for (JsonNode n : obj.path("nodes")) {
                if (n instanceof com.fasterxml.jackson.databind.node.ObjectNode on
                        && nodeKey.equals(on.path("key").asText())) {
                    on.put("formKey", formKey);
                }
            }
            dao.updateDefinitionJson(definitionId, mapper.writeValueAsString(obj));
        } catch (Exception e) {
            throw ApiException.badRequest("Failed to update workflow definition JSON: " + e.getMessage());
        }
    }

    @Transactional
    public InstanceView start(String key, StartInstanceRequest request, UserPrincipal user) {
        WorkflowDefinition def = dao.findDefinitionByKey(key)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + key));

        WorkflowNode start = dao.nodesFor(def.id()).stream()
                .filter(n -> "START".equalsIgnoreCase(n.nodeType()))
                .findFirst()
                .orElseThrow(() -> ApiException.conflict("Workflow has no START node"));

        // Enterprise RBAC: starter must hold the START node role (e.g. PROGRESS / INSPECTION).
        assertRole(user, start);

        String firstTaskKey = resolveNext(def.id(), start.nodeKey(), null)
                .orElseThrow(() -> ApiException.conflict("START has no outgoing transition"));

        WorkflowInstance instance = new WorkflowInstance(
                UUID.randomUUID(),
                def.id(),
                request != null ? request.businessKey() : null,
                "RUNNING",
                firstTaskKey,
                writeJson(request != null && request.context() != null ? request.context() : Map.of()),
                user.getId(),
                Instant.now(),
                Instant.now()
        );
        dao.insertInstance(instance);
        writeAudit(instance.id(), user.getId(), "START", start.nodeKey(), firstTaskKey, null, null);
        WorkflowNode first = dao.findNode(def.id(), firstTaskKey).orElse(null);
        if (first != null) {
            notifications.notifyRole(
                    instance.id(),
                    first.roleCode(),
                    first.label(),
                    def.name() + " — action required"
            );
        }
        return toView(instance, def, user);
    }

    public List<InstanceView> listInstances(UserPrincipal user) {
        return dao.listInstances().stream()
                .filter(i -> {
                    WorkflowDefinition def = dao.findDefinitionById(i.definitionId()).orElseThrow();
                    return canViewInstance(i, def, user);
                })
                .map(i -> {
                    WorkflowDefinition def = dao.findDefinitionById(i.definitionId()).orElseThrow();
                    return toView(i, def, user);
                })
                .toList();
    }

    public InstanceView getInstance(UUID id, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowDefinition def = dao.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized to view this instance");
        }
        return toView(instance, def, user);
    }

    @Transactional
    public InstanceView transition(UUID id, TransitionRequest request, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        if (!"RUNNING".equals(instance.status())) {
            throw ApiException.conflict("Instance is not running");
        }

        WorkflowDefinition def = dao.findDefinitionById(instance.definitionId()).orElseThrow();
        WorkflowNode current = dao.findNode(def.id(), instance.currentNodeKey())
                .orElseThrow(() -> ApiException.conflict("Current node missing"));

        assertRole(user, current);

        String action = request.action() == null ? "" : request.action().trim().toUpperCase(Locale.ROOT);
        Map<String, Object> context = readMap(instance.contextJson());

        if (request.formPayload() != null && !request.formPayload().isEmpty()) {
            context.putAll(request.formPayload());
            saveForm(instance, current, request.formPayload(), user);
        }
        if (request.notes() != null) {
            context.put("lastNotes", request.notes());
        }

        String from = current.nodeKey();
        String to;

        if ("DECISION".equalsIgnoreCase(current.nodeType())) {
            if (request.decisionValue() == null || request.decisionValue().isBlank()) {
                throw ApiException.badRequest("decisionValue required for DECISION node");
            }
            String decision = request.decisionValue().trim().toUpperCase(Locale.ROOT);
            context.put(expressionKey(current), decision);
            to = resolveNext(def.id(), from, decision)
                    .orElseThrow(() -> ApiException.conflict("No transition for decision: " + decision));
            dao.insertInspection(UUID.randomUUID(), instance.id(), current.nodeKey(), decision, request.notes(), user.getId());
            writeAudit(instance.id(), user.getId(), "DECISION_" + decision, from, to,
                    Map.of("decision", decision), request.signaturePlaceholder());
        } else if ("COMPLETE".equals(action) || "SUBMIT".equals(action) || action.isBlank()) {
            if ("END".equalsIgnoreCase(current.nodeType())) {
                throw ApiException.conflict("Instance already at END");
            }
            to = resolveNext(def.id(), from, null)
                    .orElseThrow(() -> ApiException.conflict("No outgoing transition from " + from));
            writeAudit(instance.id(), user.getId(), "COMPLETE_STEP", from, to,
                    request.formPayload(), request.signaturePlaceholder());
        } else {
            throw ApiException.badRequest("Unknown action: " + request.action());
        }

        String status = instance.status();
        WorkflowNode next = dao.findNode(def.id(), to).orElseThrow();
        if ("END".equalsIgnoreCase(next.nodeType())) {
            status = "COMPLETED";
            writeAudit(instance.id(), user.getId(), "COMPLETE_WORKFLOW", from, to, null, request.signaturePlaceholder());
        }

        WorkflowInstance updated = new WorkflowInstance(
                instance.id(), instance.definitionId(), instance.businessKey(), status, to,
                writeJson(context), instance.startedBy(), instance.startedAt(), Instant.now()
        );
        dao.updateInstance(updated);
        if (!"END".equalsIgnoreCase(next.nodeType())) {
            notifications.notifyRole(
                    updated.id(),
                    next.roleCode(),
                    next.label(),
                    def.name() + " — next step waiting"
            );
        }
        // Keep work-package part lines in sync when this instance is bound to a part.
        if ("COMPLETED".equals(status) || "CANCELLED".equals(status)) {
            WorkPackageService wp = workPackages.getIfAvailable();
            if (wp != null) {
                wp.syncPartFromInstance(updated.id());
            }
        }
        return toView(updated, def, user);
    }

    @Transactional
    public void submitForm(UUID id, FormSubmitRequest request, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowNode current = dao.findNode(instance.definitionId(), instance.currentNodeKey())
                .orElseThrow(() -> ApiException.conflict("Current node missing"));
        assertRole(user, current);
        saveForm(instance, current, request.payload(), user);
        writeAudit(instance.id(), user.getId(), "SUBMIT_FORM", current.nodeKey(), current.nodeKey(),
                request.payload(), null);
    }

    public List<AuditView> audit(UUID id) {
        if (!dao.instanceExists(id)) {
            throw ApiException.notFound("Instance not found");
        }
        return dao.auditsFor(id).stream()
                .map(a -> new AuditView(a.id(), a.action(), a.fromNode(), a.toNode(),
                        a.userId(), a.signaturePlaceholder(), a.createdAt()))
                .toList();
    }

    public List<DocumentView> listDocuments(UUID id, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowDefinition def = dao.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized to view instance documents");
        }
        return dao.documentsFor(id).stream()
                .map(d -> new DocumentView(d.id(), d.fileName(), d.contentType(), d.nodeKey(), d.uploadedAt()))
                .toList();
    }

    public Resource loadDocument(UUID instanceId, UUID documentId, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(instanceId)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowDefinition def = dao.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized to download attachment");
        }
        DocumentEntry doc = dao.findDocument(documentId)
                .orElseThrow(() -> ApiException.notFound("Document not found"));
        if (!doc.instanceId().equals(instanceId)) {
            throw ApiException.notFound("Document not found");
        }
        Resource resource = attachments.loadAsResource(doc.storageKey());
        if (resource == null || !resource.exists()) {
            throw ApiException.notFound("File missing from storage");
        }
        return resource;
    }

    public String documentContentType(UUID instanceId, UUID documentId, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(instanceId).orElseThrow();
        WorkflowDefinition def = dao.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized");
        }
        return dao.findDocument(documentId)
                .filter(d -> d.instanceId().equals(instanceId))
                .map(DocumentEntry::contentType)
                .orElse("application/octet-stream");
    }

    public String documentFileName(UUID instanceId, UUID documentId, UserPrincipal user) {
        dao.findInstance(instanceId).orElseThrow(() -> ApiException.notFound("Instance not found"));
        return dao.findDocument(documentId)
                .filter(d -> d.instanceId().equals(instanceId))
                .map(DocumentEntry::fileName)
                .orElse("download.bin");
    }

    @Transactional
    public DocumentView storeDocument(UUID id, String fileName, String contentType, String storageKey, UserPrincipal user) {
        WorkflowInstance instance = dao.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        DocumentEntry doc = new DocumentEntry(
                UUID.randomUUID(), instance.id(), instance.currentNodeKey(), fileName, contentType,
                storageKey, user.getId(), Instant.now()
        );
        dao.insertDocument(doc);
        writeAudit(instance.id(), user.getId(), "UPLOAD_DOCUMENT", instance.currentNodeKey(),
                instance.currentNodeKey(), Map.of("fileName", fileName), null);
        return new DocumentView(doc.id(), doc.fileName(), doc.contentType(), doc.nodeKey(), doc.uploadedAt());
    }

    private Optional<String> resolveNext(UUID definitionId, String from, String decisionValue) {
        return decisionEngine.resolve(dao.transitionsFrom(definitionId, from), decisionValue)
                .map(WorkflowTransition::toNodeKey);
    }

    private boolean canViewInstance(WorkflowInstance instance, WorkflowDefinition def, UserPrincipal user) {
        if (instance.startedBy() != null && instance.startedBy().equals(user.getId())) {
            return true;
        }
        if (dao.userParticipated(instance.id(), user.getId())) {
            return true;
        }
        // AUTHZ: completed instances remain visible to QA / Customer for acceptance review.
        if ("COMPLETED".equalsIgnoreCase(instance.status()) && hasAnyRole(user, "QA", "CUSTOMER")) {
            return true;
        }
        WorkflowNode node = dao.findNode(def.id(), instance.currentNodeKey()).orElse(null);
        if (node == null) {
            return false;
        }
        if (node.roleCode() == null || node.roleCode().isBlank()) {
            return true;
        }
        return hasAnyRole(user, node.roleCode());
    }

    private static boolean hasAnyRole(UserPrincipal user, String... roles) {
        if (roles == null || roles.length == 0) {
            return false;
        }
        return user.getRoles().stream().anyMatch(r -> {
            for (String needed : roles) {
                if (r != null && r.equalsIgnoreCase(needed)) {
                    return true;
                }
            }
            return false;
        });
    }

    private void assertRole(UserPrincipal user, WorkflowNode node) {
        if (node.roleCode() == null || node.roleCode().isBlank()) {
            return;
        }
        boolean allowed = user.getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(node.roleCode()));
        if (!allowed) {
            throw ApiException.forbidden("Role " + node.roleCode() + " required for step " + node.nodeKey());
        }
    }

    private void saveForm(WorkflowInstance instance, WorkflowNode node, Map<String, Object> payload, UserPrincipal user) {
        formStore.save(
                UUID.randomUUID(),
                instance.id(),
                node.formKey() != null ? node.formKey() : "generic",
                node.nodeKey(),
                writeJson(payload),
                user.getId()
        );
    }

    private void writeAudit(UUID instanceId, UUID userId, String action, String from, String to,
                            Object payload, String signature) {
        dao.insertAudit(new AuditEntry(
                UUID.randomUUID(), instanceId, userId, action, from, to,
                payload == null ? null : writeJson(payload), signature, Instant.now()
        ));
    }

    private InstanceView toView(WorkflowInstance instance, WorkflowDefinition def, UserPrincipal user) {
        WorkflowNode node = dao.findNode(def.id(), instance.currentNodeKey())
                .orElseThrow(() -> ApiException.conflict("Current node missing"));
        List<String> options = readOptions(node);
        return new InstanceView(
                instance.id(),
                def.key(),
                def.name(),
                instance.businessKey(),
                instance.status(),
                new NodeView(node.nodeKey(), node.nodeType(), node.label(), node.roleCode(), node.formKey(), options),
                buildActions(node, options, user),
                readMap(instance.contextJson()),
                instance.startedAt(),
                instance.updatedAt()
        );
    }

    private List<AllowedAction> buildActions(WorkflowNode node, List<String> options, UserPrincipal user) {
        boolean canAct = node.roleCode() == null
                || node.roleCode().isBlank()
                || user.getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(node.roleCode()));
        if (!canAct || "END".equalsIgnoreCase(node.nodeType())) {
            return List.of();
        }
        if ("DECISION".equalsIgnoreCase(node.nodeType())) {
            return options.stream().map(o -> new AllowedAction("DECISION", o, o)).toList();
        }
        return List.of(new AllowedAction("COMPLETE", "COMPLETE", "Complete step"));
    }

    private List<String> readOptions(WorkflowNode node) {
        if (node.configJson() == null || node.configJson().isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = mapper.readTree(node.configJson());
            if (root.has("options") && root.get("options").isArray()) {
                List<String> opts = new ArrayList<>();
                root.get("options").forEach(n -> opts.add(n.asText()));
                return opts;
            }
        } catch (Exception ignored) {}
        return List.of();
    }

    private String expressionKey(WorkflowNode node) {
        try {
            if (node.configJson() != null) {
                JsonNode root = mapper.readTree(node.configJson());
                if (root.has("expression")) {
                    return root.get("expression").asText();
                }
            }
        } catch (Exception ignored) {}
        return node.nodeKey();
    }

    private Map<String, Object> readMap(String json) {
        try {
            if (json == null || json.isBlank()) return new HashMap<>();
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String writeJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw ApiException.badRequest("Unable to serialize JSON");
        }
    }
}
