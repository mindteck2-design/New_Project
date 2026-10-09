package com.hal.amms.web;

import com.hal.amms.security.UserPrincipal;
import com.hal.amms.service.AttachmentStorageService;
import com.hal.amms.web.dto.ApiDtos.*;
import com.hal.amms.workflow.WorkflowService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final AttachmentStorageService attachmentStorage;

    public WorkflowController(WorkflowService workflowService, AttachmentStorageService attachmentStorage) {
        this.workflowService = workflowService;
        this.attachmentStorage = attachmentStorage;
    }

    @GetMapping("/workflows")
    public List<WorkflowSummary> workflows() {
        return workflowService.listWorkflows();
    }

    @PostMapping("/workflows")
    public WorkflowSummary createWorkflow(@RequestBody CreateWorkflowRequest request) {
        return workflowService.createWorkflow(request);
    }

    @GetMapping("/workflows/{key}")
    public Map<String, Object> workflow(@PathVariable String key) {
        return workflowService.getDefinition(key);
    }

    /**
     * Attach an existing Mongo form schema to a TASK node (part of the workflow chart).
     */
    @PutMapping("/workflows/{key}/nodes/{nodeKey}/form")
    public Map<String, Object> assignNodeForm(
            @PathVariable String key,
            @PathVariable String nodeKey,
            @RequestBody Map<String, String> body
    ) {
        String formKey = body == null ? null : body.get("formKey");
        return workflowService.assignNodeForm(key, nodeKey, formKey);
    }

    @PostMapping("/workflows/{key}/instances")
    public InstanceView start(
            @PathVariable String key,
            @RequestBody(required = false) StartInstanceRequest request,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return workflowService.start(key, request == null ? new StartInstanceRequest(null, Map.of()) : request, user);
    }

    @GetMapping("/instances")
    public List<InstanceView> instances(@AuthenticationPrincipal UserPrincipal user) {
        return workflowService.listInstances(user);
    }

    @GetMapping("/instances/{id}")
    public InstanceView instance(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        return workflowService.getInstance(id, user);
    }

    @PostMapping("/instances/{id}/transitions")
    public InstanceView transition(
            @PathVariable UUID id,
            @RequestBody TransitionRequest request,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return workflowService.transition(id, request, user);
    }

    @PostMapping("/instances/{id}/forms")
    public Map<String, String> submitForm(
            @PathVariable UUID id,
            @RequestBody FormSubmitRequest request,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        workflowService.submitForm(id, request, user);
        return Map.of("status", "ok");
    }

    @GetMapping("/instances/{id}/audit")
    public List<AuditView> audit(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        workflowService.getInstance(id, user);
        return workflowService.audit(id);
    }

    @GetMapping("/instances/{id}/documents")
    public List<DocumentView> documents(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        return workflowService.listDocuments(id, user);
    }

    @GetMapping("/instances/{instanceId}/documents/{documentId}/content")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable UUID instanceId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        Resource body = workflowService.loadDocument(instanceId, documentId, user);
        String fileName = workflowService.documentFileName(instanceId, documentId, user);
        String contentType = workflowService.documentContentType(instanceId, documentId, user);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(contentType == null ? "application/octet-stream" : contentType))
                .body(body);
    }

    @PostMapping("/instances/{id}/documents")
    public DocumentView upload(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal user
    ) throws Exception {
        String storageKey = id + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
        attachmentStorage.store(storageKey, file);
        return workflowService.storeDocument(
                id,
                file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename(),
                file.getContentType(),
                storageKey,
                user
        );
    }
}
