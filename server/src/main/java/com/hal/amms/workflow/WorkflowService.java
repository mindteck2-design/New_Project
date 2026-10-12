package com.hal.amms.workflow;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hal.amms.identity.AmmsRole;
import com.hal.amms.shared.AmmsDateTimes;
import com.hal.amms.shared.EnumCodes;
import com.hal.amms.workflow.domain.*;
import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.attachments.AttachmentStorageService;
import com.hal.amms.forms.FormSubmissionStore;
import com.hal.amms.notification.NotificationService;
import com.hal.amms.workpackage.WorkPackageService;
import com.hal.amms.platform.web.ApiException;
import com.hal.amms.workflow.api.WorkflowDtos.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.Locale;

@Service
public class WorkflowService {

    private final WorkflowRepository repository;
    private final DecisionEngine decisionEngine;
    private final ObjectMapper mapper;
    private final AttachmentStorageService attachments;
    private final FormSubmissionStore formStore;
    private final NotificationService notifications;
    private final ObjectProvider<WorkPackageService> workPackages;

    public WorkflowService(
            WorkflowRepository repository,
            DecisionEngine decisionEngine,
            ObjectMapper mapper,
            AttachmentStorageService attachments,
            FormSubmissionStore formStore,
            NotificationService notifications,
            ObjectProvider<WorkPackageService> workPackages
    ) {
        this.repository = repository;
        this.decisionEngine = decisionEngine;
        this.mapper = mapper;
        this.attachments = attachments;
        this.formStore = formStore;
        this.notifications = notifications;
        this.workPackages = workPackages;
    }

    public List<WorkflowSummary> listWorkflows(
            boolean includeInactive,
            String workTypeFilter,
            String aircraftTypeFilter
    ) {
        String workType = workTypeFilter == null || workTypeFilter.isBlank() || "ALL".equalsIgnoreCase(workTypeFilter)
                ? null
                : workTypeFilter.trim().toUpperCase(Locale.ROOT);
        String aircraft = aircraftTypeFilter == null || aircraftTypeFilter.isBlank() || "ALL".equalsIgnoreCase(aircraftTypeFilter)
                ? null
                : aircraftTypeFilter.trim().toUpperCase(Locale.ROOT);
        return repository.listDefinitions(includeInactive).stream()
                .map(this::toSummary)
                // Missing workType / aircraftTypes = applicable to all (generic master charts).
                .filter(s -> workType == null
                        || s.workType() == null
                        || s.workType().isBlank()
                        || workType.equalsIgnoreCase(s.workType()))
                .filter(s -> aircraft == null
                        || s.aircraftTypes() == null
                        || s.aircraftTypes().isEmpty()
                        || matchesAircraft(s.aircraftTypes(), aircraft))
                .toList();
    }

    public List<WorkflowSummary> listWorkflows() {
        return listWorkflows(false, null, null);
    }

    private static boolean matchesAircraft(List<String> types, String needle) {
        for (String t : types) {
            if (t != null && needle.equalsIgnoreCase(t.trim())) {
                return true;
            }
        }
        return false;
    }

    public Map<String, Object> getDefinition(String key) {
        WorkflowDefinition def = repository.findDefinitionByKey(key, false)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + key));
        try {
            Map<String, Object> raw = mapper.readValue(def.definitionJson(), new TypeReference<>() {});
            // Prefer live node rows (formKey may have been assigned after seed).
            List<Map<String, Object>> liveNodes = repository.nodesFor(def.id()).stream()
                    .map(n -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("key", n.nodeKey());
                        m.put("type", EnumCodes.code(n.nodeType()));
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
            raw.put("active", def.active());
            raw.put("workType", metaString(raw, "workType"));
            raw.put("aircraftTypes", metaStringList(raw, "aircraftTypes"));
            raw.put("description", metaString(raw, "description"));
            return raw;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid definition JSON");
        }
    }

    private WorkflowSummary toSummary(WorkflowDefinition d) {
        Map<String, Object> meta = readDefinitionMeta(d.definitionJson());
        return new WorkflowSummary(
                d.id(),
                d.key(),
                d.name(),
                d.version(),
                d.active(),
                metaString(meta, "workType"),
                metaStringList(meta, "aircraftTypes"),
                metaString(meta, "description")
        );
    }

    private Map<String, Object> readDefinitionMeta(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String metaString(Map<String, Object> meta, String key) {
        if (meta == null || meta.get(key) == null) {
            return null;
        }
        String s = String.valueOf(meta.get(key)).trim();
        return s.isEmpty() || "null".equalsIgnoreCase(s) ? null : s;
    }

    @SuppressWarnings("unchecked")
    private static List<String> metaStringList(Map<String, Object> meta, String key) {
        if (meta == null || meta.get(key) == null) {
            return List.of();
        }
        Object raw = meta.get(key);
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object item : list) {
                if (item == null) continue;
                String s = String.valueOf(item).trim();
                if (!s.isEmpty()) out.add(s);
            }
            return out;
        }
        String s = String.valueOf(raw).trim();
        if (s.isEmpty()) return List.of();
        return Arrays.stream(s.split("[,;]")).map(String::trim).filter(t -> !t.isEmpty()).toList();
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
        if (repository.definitionExists(key)) {
            throw ApiException.conflict("Workflow already exists: " + key);
        }
        boolean hasStart = request.nodes().stream().anyMatch(n -> NodeType.START.matches(n.type()));
        boolean hasEnd = request.nodes().stream().anyMatch(n -> NodeType.END.matches(n.type()));
        if (!hasStart || !hasEnd) {
            throw ApiException.badRequest("workflow must include START and END nodes");
        }
        for (WorkflowNodeDraft n : request.nodes()) {
            if (n.key() == null || n.key().isBlank() || n.type() == null || n.label() == null) {
                throw ApiException.badRequest("each node needs key, type, and label");
            }
            if (NodeType.TASK.matches(n.type()) && (n.formKey() == null || n.formKey().isBlank())) {
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
            if (request.description() != null && !request.description().isBlank()) {
                definition.put("description", request.description().trim());
            }
            if (request.workType() != null && !request.workType().isBlank()) {
                definition.put("workType", request.workType().trim().toUpperCase(Locale.ROOT));
            }
            if (request.aircraftTypes() != null && !request.aircraftTypes().isEmpty()) {
                definition.put(
                        "aircraftTypes",
                        request.aircraftTypes().stream()
                                .filter(Objects::nonNull)
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .toList()
                );
            }
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
            repository.upsertDefinition(defId, key, request.name().trim(), version, json);
            defId = repository.definitionIdByKey(key);

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
                repository.insertNode(new WorkflowNode(
                        UUID.randomUUID(),
                        defId,
                        n.key().trim(),
                        NodeType.parse(n.type()),
                        n.roleCode().trim().toUpperCase(),
                        n.formKey() == null || n.formKey().isBlank() ? null : n.formKey().trim().toLowerCase(),
                        n.label().trim(),
                        config
                ));
            }
            int priority = 0;
            for (WorkflowTransitionDraft t : request.transitions()) {
                repository.insertTransition(new WorkflowTransition(
                        UUID.randomUUID(),
                        defId,
                        t.from(),
                        t.to(),
                        t.when() == null || t.when().isBlank() ? null : t.when(),
                        priority++
                ));
            }
            return toSummary(repository.findDefinitionByKey(key, false).orElseThrow());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Could not create workflow: " + e.getMessage());
        }
    }

    @Transactional
    public WorkflowSummary setWorkflowActive(String key, boolean active) {
        WorkflowDefinition def = repository.findDefinitionByKey(key, false)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + key));
        try {
            repository.setDefinitionActive(def.key(), active);
        } catch (IllegalArgumentException ex) {
            throw ApiException.notFound(ex.getMessage());
        }
        return toSummary(repository.findDefinitionByKey(key, false).orElseThrow());
    }

    /**
     * Clone an existing chart under a new key (preserves stages/forms; new version starts at 1, active).
     */
    @Transactional
    public WorkflowSummary cloneWorkflow(String sourceKey, CloneWorkflowRequest request) {
        if (request == null || request.newKey() == null || request.newKey().isBlank()) {
            throw ApiException.badRequest("newKey is required");
        }
        WorkflowDefinition source = repository.findDefinitionByKey(sourceKey, false)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + sourceKey));
        String newKey = request.newKey().trim().toLowerCase(Locale.ROOT);
        if (!newKey.matches("^[a-z][a-z0-9-]{1,62}$")) {
            throw ApiException.badRequest("newKey must be lowercase kebab-case (2–63 chars)");
        }
        if (repository.definitionExists(newKey)) {
            throw ApiException.conflict("Workflow already exists: " + newKey);
        }
        String newName = request.name() == null || request.name().isBlank()
                ? source.name() + " (copy)"
                : request.name().trim();
        try {
            Map<String, Object> raw = mapper.readValue(source.definitionJson(), new TypeReference<>() {});
            raw.put("key", newKey);
            raw.put("name", newName);
            raw.put("version", 1);
            raw.put("clonedFrom", source.key());
            String json = mapper.writeValueAsString(raw);
            UUID defId = UUID.randomUUID();
            repository.upsertDefinition(defId, newKey, newName, 1, json);
            defId = repository.definitionIdByKey(newKey);
            for (WorkflowNode n : repository.nodesFor(source.id())) {
                repository.insertNode(new WorkflowNode(
                        UUID.randomUUID(),
                        defId,
                        n.nodeKey(),
                        n.nodeType(),
                        n.roleCode(),
                        n.formKey(),
                        n.label(),
                        n.configJson()
                ));
            }
            int priority = 0;
            for (WorkflowTransition t : repository.transitionsFor(source.id())) {
                repository.insertTransition(new WorkflowTransition(
                        UUID.randomUUID(),
                        defId,
                        t.fromNodeKey(),
                        t.toNodeKey(),
                        t.conditionValue(),
                        priority++
                ));
            }
            return toSummary(repository.findDefinitionByKey(newKey, false).orElseThrow());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Could not clone workflow: " + e.getMessage());
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
        WorkflowDefinition def = repository.findDefinitionByKey(workflowKey, false)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + workflowKey));
        WorkflowNode node = repository.findNode(def.id(), nodeKey)
                .orElseThrow(() -> ApiException.notFound("Node not found: " + nodeKey));
        if (node.nodeType() != NodeType.TASK) {
            throw ApiException.badRequest("Only TASK nodes can carry a dynamic form (got " + node.nodeType() + ")");
        }
        try {
            repository.updateNodeFormKey(def.id(), nodeKey, normalizedForm);
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
            String json = repository.definitionJsonById(definitionId);
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
            repository.updateDefinitionJson(definitionId, mapper.writeValueAsString(obj));
        } catch (Exception e) {
            throw ApiException.badRequest("Failed to update workflow definition JSON: " + e.getMessage());
        }
    }

    @Transactional
    public InstanceView start(String key, StartInstanceRequest request, UserPrincipal user) {
        WorkflowDefinition def = repository.findDefinitionByKey(key)
                .orElseThrow(() -> ApiException.notFound("Workflow not found: " + key));

        WorkflowNode start = repository.nodesFor(def.id()).stream()
                .filter(n -> n.nodeType() == NodeType.START)
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
                InstanceStatus.RUNNING,
                firstTaskKey,
                writeJson(request != null && request.context() != null ? request.context() : Map.of()),
                user.getId(),
                AmmsDateTimes.now(),
                AmmsDateTimes.now()
        );
        repository.insertInstance(instance);
        writeAudit(instance.id(), user.getId(), "START", start.nodeKey(), firstTaskKey, null, null);
        WorkflowNode first = repository.findNode(def.id(), firstTaskKey).orElse(null);
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
        return repository.listInstances().stream()
                .filter(i -> {
                    WorkflowDefinition def = repository.findDefinitionById(i.definitionId()).orElseThrow();
                    return canViewInstance(i, def, user);
                })
                .map(i -> {
                    WorkflowDefinition def = repository.findDefinitionById(i.definitionId()).orElseThrow();
                    return toView(i, def, user);
                })
                .toList();
    }

    public InstanceView getInstance(UUID id, UserPrincipal user) {
        WorkflowInstance instance = repository.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowDefinition def = repository.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized to view this instance");
        }
        return toView(instance, def, user);
    }

    @Transactional
    public InstanceView transition(UUID id, TransitionRequest request, UserPrincipal user) {
        WorkflowInstance instance = repository.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        if (instance.status() != InstanceStatus.RUNNING) {
            throw ApiException.conflict("Instance is not running");
        }

        WorkflowDefinition def = repository.findDefinitionById(instance.definitionId()).orElseThrow();
        WorkflowNode current = repository.findNode(def.id(), instance.currentNodeKey())
                .orElseThrow(() -> ApiException.conflict("Current node missing"));

        assertRole(user, current);

        String action = request.action() == null ? "" : request.action().trim();
        Map<String, Object> context = readMap(instance.contextJson());

        if (request.formPayload() != null && !request.formPayload().isEmpty()) {
            Map<String, Object> formPayload = AmmsDateTimes.normalizeFormPayloadDates(request.formPayload(), null);
            context.putAll(formPayload);
            saveForm(instance, current, formPayload, user);
        }
        if (request.notes() != null) {
            context.put("lastNotes", request.notes());
        }

        String from = current.nodeKey();
        String to;

        if (current.nodeType() == NodeType.DECISION) {
            if (request.decisionValue() == null || request.decisionValue().isBlank()) {
                throw ApiException.badRequest("decisionValue required for DECISION node");
            }
            String decision = request.decisionValue().trim().toUpperCase(Locale.ROOT);
            context.put(expressionKey(current), decision);
            to = resolveNext(def.id(), from, decision)
                    .orElseThrow(() -> ApiException.conflict("No transition for decision: " + decision));
            repository.insertInspection(UUID.randomUUID(), instance.id(), current.nodeKey(), decision, request.notes(), user.getId());
            writeAudit(instance.id(), user.getId(), "DECISION_" + decision, from, to,
                    Map.of("decision", decision), request.signaturePlaceholder());
        } else if (StepAction.isCompleteLike(action)) {
            if (current.nodeType() == NodeType.END) {
                throw ApiException.conflict("Instance already at END");
            }
            to = resolveNext(def.id(), from, null)
                    .orElseThrow(() -> ApiException.conflict("No outgoing transition from " + from));
            writeAudit(instance.id(), user.getId(), "COMPLETE_STEP", from, to,
                    request.formPayload(), request.signaturePlaceholder());
        } else {
            throw ApiException.badRequest("Unknown action: " + request.action());
        }

        InstanceStatus status = instance.status();
        WorkflowNode next = repository.findNode(def.id(), to).orElseThrow();
        if (next.nodeType() == NodeType.END) {
            status = InstanceStatus.COMPLETED;
            writeAudit(instance.id(), user.getId(), "COMPLETE_WORKFLOW", from, to, null, request.signaturePlaceholder());
        }

        WorkflowInstance updated = new WorkflowInstance(
                instance.id(), instance.definitionId(), instance.businessKey(), status, to,
                writeJson(context), instance.startedBy(), instance.startedAt(), AmmsDateTimes.now()
        );
        repository.updateInstance(updated);
        if (next.nodeType() != NodeType.END) {
            notifications.notifyRole(
                    updated.id(),
                    next.roleCode(),
                    next.label(),
                    def.name() + " — next step waiting"
            );
        }
        // Keep work-package part lines in sync when this instance is bound to a part.
        if (status.isTerminal()) {
            WorkPackageService wp = workPackages.getIfAvailable();
            if (wp != null) {
                wp.syncPartFromInstance(updated.id());
            }
        }
        return toView(updated, def, user);
    }

    @Transactional
    public void submitForm(UUID id, FormSubmitRequest request, UserPrincipal user) {
        WorkflowInstance instance = repository.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowNode current = repository.findNode(instance.definitionId(), instance.currentNodeKey())
                .orElseThrow(() -> ApiException.conflict("Current node missing"));
        assertRole(user, current);
        saveForm(instance, current, request.payload(), user);
        writeAudit(instance.id(), user.getId(), "SUBMIT_FORM", current.nodeKey(), current.nodeKey(),
                request.payload(), null);
    }

    public List<AuditView> audit(UUID id) {
        if (!repository.instanceExists(id)) {
            throw ApiException.notFound("Instance not found");
        }
        return repository.auditsFor(id).stream()
                .map(a -> new AuditView(a.id(), a.action(), a.fromNode(), a.toNode(),
                        a.userId(), a.signaturePlaceholder(), a.createdAt()))
                .toList();
    }

    public List<DocumentView> listDocuments(UUID id, UserPrincipal user) {
        WorkflowInstance instance = repository.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowDefinition def = repository.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized to view instance documents");
        }
        return repository.documentsFor(id).stream()
                .map(d -> new DocumentView(d.id(), d.fileName(), d.contentType(), d.nodeKey(), d.uploadedAt()))
                .toList();
    }

    public Resource loadDocument(UUID instanceId, UUID documentId, UserPrincipal user) {
        WorkflowInstance instance = repository.findInstance(instanceId)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        WorkflowDefinition def = repository.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized to download attachment");
        }
        DocumentEntry doc = repository.findDocument(documentId)
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
        WorkflowInstance instance = repository.findInstance(instanceId).orElseThrow();
        WorkflowDefinition def = repository.findDefinitionById(instance.definitionId()).orElseThrow();
        if (!canViewInstance(instance, def, user)) {
            throw ApiException.forbidden("Not authorized");
        }
        return repository.findDocument(documentId)
                .filter(d -> d.instanceId().equals(instanceId))
                .map(DocumentEntry::contentType)
                .orElse("application/octet-stream");
    }

    public String documentFileName(UUID instanceId, UUID documentId, UserPrincipal user) {
        repository.findInstance(instanceId).orElseThrow(() -> ApiException.notFound("Instance not found"));
        return repository.findDocument(documentId)
                .filter(d -> d.instanceId().equals(instanceId))
                .map(DocumentEntry::fileName)
                .orElse("download.bin");
    }

    @Transactional
    public DocumentView storeDocument(UUID id, String fileName, String contentType, String storageKey, UserPrincipal user) {
        WorkflowInstance instance = repository.findInstance(id)
                .orElseThrow(() -> ApiException.notFound("Instance not found"));
        DocumentEntry doc = new DocumentEntry(
                UUID.randomUUID(), instance.id(), instance.currentNodeKey(), fileName, contentType,
                storageKey, user.getId(), AmmsDateTimes.now()
        );
        repository.insertDocument(doc);
        writeAudit(instance.id(), user.getId(), "UPLOAD_DOCUMENT", instance.currentNodeKey(),
                instance.currentNodeKey(), Map.of("fileName", fileName), null);
        return new DocumentView(doc.id(), doc.fileName(), doc.contentType(), doc.nodeKey(), doc.uploadedAt());
    }

    private Optional<String> resolveNext(UUID definitionId, String from, String decisionValue) {
        return decisionEngine.resolve(repository.transitionsFrom(definitionId, from), decisionValue)
                .map(WorkflowTransition::toNodeKey);
    }

    private boolean canViewInstance(WorkflowInstance instance, WorkflowDefinition def, UserPrincipal user) {
        if (instance.startedBy() != null && instance.startedBy().equals(user.getId())) {
            return true;
        }
        if (repository.userParticipated(instance.id(), user.getId())) {
            return true;
        }
        // AUTHZ: completed instances remain visible to QA / Customer for acceptance review.
        if (instance.status() == InstanceStatus.COMPLETED && AmmsRole.userHasAny(user.getRoles(), AmmsRole.QA, AmmsRole.CUSTOMER)) {
            return true;
        }
        WorkflowNode node = repository.findNode(def.id(), instance.currentNodeKey()).orElse(null);
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
        for (String needed : roles) {
            if (AmmsRole.userHas(user.getRoles(), needed)) {
                return true;
            }
        }
        return false;
    }

    private void assertRole(UserPrincipal user, WorkflowNode node) {
        if (node.roleCode() == null || node.roleCode().isBlank()) {
            return;
        }
        if (!AmmsRole.userHas(user.getRoles(), node.roleCode())) {
            throw ApiException.forbidden("Role " + node.roleCode() + " required for step " + node.nodeKey());
        }
    }

    private void saveForm(WorkflowInstance instance, WorkflowNode node, Map<String, Object> payload, UserPrincipal user) {
        // Calendar dates (DOB etc.) stay YYYY-MM-DD — never midnight Instant (off-by-one TZ bug).
        Map<String, Object> normalized = AmmsDateTimes.normalizeFormPayloadDates(payload, null);
        formStore.save(
                UUID.randomUUID(),
                instance.id(),
                node.formKey() != null ? node.formKey() : "generic",
                node.nodeKey(),
                writeJson(normalized),
                user.getId()
        );
    }

    private void writeAudit(UUID instanceId, UUID userId, String action, String from, String to,
                            Object payload, String signature) {
        repository.insertAudit(new AuditEntry(
                UUID.randomUUID(), instanceId, userId, action, from, to,
                payload == null ? null : writeJson(payload), signature, AmmsDateTimes.now()
        ));
    }

    private InstanceView toView(WorkflowInstance instance, WorkflowDefinition def, UserPrincipal user) {
        WorkflowNode node = repository.findNode(def.id(), instance.currentNodeKey())
                .orElseThrow(() -> ApiException.conflict("Current node missing"));
        List<String> options = readOptions(node);
        return new InstanceView(
                instance.id(),
                def.key(),
                def.name(),
                instance.businessKey(),
                EnumCodes.code(instance.status()),
                new NodeView(node.nodeKey(), EnumCodes.code(node.nodeType()), node.label(), node.roleCode(), node.formKey(), options),
                buildActions(node, options, user),
                readMap(instance.contextJson()),
                instance.startedAt(),
                instance.updatedAt()
        );
    }

    private List<AllowedAction> buildActions(WorkflowNode node, List<String> options, UserPrincipal user) {
        boolean canAct = node.roleCode() == null
                || node.roleCode().isBlank()
                || AmmsRole.userHas(user.getRoles(), node.roleCode());
        if (!canAct || node.nodeType() == NodeType.END) {
            return List.of();
        }
        if (node.nodeType() == NodeType.DECISION) {
            return options.stream()
                    .map(o -> new AllowedAction(AllowedActionType.DECISION.name(), o, o))
                    .toList();
        }
        return List.of(new AllowedAction(
                AllowedActionType.COMPLETE.name(),
                StepAction.COMPLETE.name(),
                "Complete step"
        ));
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
