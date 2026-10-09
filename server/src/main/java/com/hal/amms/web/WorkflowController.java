package com.hal.amms.web;

import com.hal.amms.security.UserPrincipal;
import com.hal.amms.web.dto.ApiDtos.*;
import com.hal.amms.workflow.WorkflowService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final Path attachmentsDir;

    public WorkflowController(
            WorkflowService workflowService,
            @org.springframework.beans.factory.annotation.Value("${amms.attachments.dir:.data/attachments}") String attachmentsDir
    ) {
        this.workflowService = workflowService;
        this.attachmentsDir = Path.of(attachmentsDir).toAbsolutePath().normalize();
    }

    @GetMapping("/workflows")
    public List<WorkflowSummary> workflows() {
        return workflowService.listWorkflows();
    }

    @GetMapping("/workflows/{key}")
    public Map<String, Object> workflow(@PathVariable String key) {
        return workflowService.getDefinition(key);
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
    public List<AuditView> audit(@PathVariable UUID id) {
        return workflowService.audit(id);
    }

    @GetMapping("/instances/{id}/documents")
    public List<DocumentView> documents(@PathVariable UUID id) {
        return workflowService.listDocuments(id);
    }

    @PostMapping("/instances/{id}/documents")
    public DocumentView upload(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal user
    ) throws Exception {
        Files.createDirectories(attachmentsDir);
        String storageKey = id + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path target = attachmentsDir.resolve(storageKey);
        Files.createDirectories(target.getParent());
        file.transferTo(target);
        return workflowService.storeDocument(
                id,
                file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename(),
                file.getContentType(),
                storageKey,
                user
        );
    }
}
