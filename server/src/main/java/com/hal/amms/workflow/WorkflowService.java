package com.hal.amms.workflow;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hal.amms.dao.WorkflowDao;
import com.hal.amms.model.Models.*;
import com.hal.amms.security.UserPrincipal;
import com.hal.amms.web.ApiException;
import com.hal.amms.web.dto.ApiDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class WorkflowService {

    private final WorkflowDao dao;
    private final DecisionEngine decisionEngine;
    private final ObjectMapper mapper;

    public WorkflowService(WorkflowDao dao, DecisionEngine decisionEngine, ObjectMapper mapper) {
        this.dao = dao;
        this.decisionEngine = decisionEngine;
        this.mapper = mapper;
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
            return mapper.readValue(def.definitionJson(), new TypeReference<>() {});
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid definition JSON");
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
        return toView(instance, def, user);
    }

    public List<InstanceView> listInstances(UserPrincipal user) {
        return dao.listInstances().stream()
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

    public List<DocumentView> listDocuments(UUID id) {
        if (!dao.instanceExists(id)) {
            throw ApiException.notFound("Instance not found");
        }
        return dao.documentsFor(id).stream()
                .map(d -> new DocumentView(d.id(), d.fileName(), d.contentType(), d.nodeKey(), d.uploadedAt()))
                .toList();
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
        dao.insertForm(
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
                readMap(instance.contextJson())
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
