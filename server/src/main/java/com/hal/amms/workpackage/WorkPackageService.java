package com.hal.amms.workpackage;

import com.hal.amms.workpackage.WorkPackageRepository.PartRow;
import com.hal.amms.workpackage.WorkPackageRepository.WorkPackageRow;
import com.hal.amms.workflow.WorkflowRepository;
import com.hal.amms.shared.EnumCodes;
import com.hal.amms.workflow.domain.InstanceStatus;
import com.hal.amms.workflow.domain.WorkflowDefinition;
import com.hal.amms.workflow.domain.WorkflowInstance;
import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.platform.web.ApiException;
import com.hal.amms.shared.AmmsDateTimes;
import com.hal.amms.workflow.api.WorkflowDtos.InstanceView;
import com.hal.amms.workflow.api.WorkflowDtos.StartInstanceRequest;
import com.hal.amms.workflow.WorkflowService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkPackageService {

    private final WorkPackageRepository packages;
    private final WorkflowRepository workflows;
    private final WorkflowService workflowService;

    public WorkPackageService(WorkPackageRepository packages, WorkflowRepository workflows, WorkflowService workflowService) {
        this.packages = packages;
        this.workflows = workflows;
        this.workflowService = workflowService;
    }

    public List<Map<String, Object>> list() {
        return packages.listPackages().stream().map(this::toPackageView).toList();
    }

    public Map<String, Object> get(UUID id) {
        WorkPackageRow row = packages.findPackage(id)
                .orElseThrow(() -> ApiException.notFound("Work package not found"));
        Map<String, Object> view = toPackageView(row);
        List<Map<String, Object>> parts = new ArrayList<>();
        for (PartRow p : packages.partsFor(id)) {
            parts.add(toPartView(p, row));
        }
        view.put("parts", parts);
        return view;
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, UserPrincipal user) {
        String aircraftId = str(body, "aircraftId");
        String po = str(body, "poNumber");
        String so = str(body, "soNumber");
        String testingType = str(body, "testingType");
        String workflowKey = str(body, "workflowKey");
        String notes = str(body, "notes");
        if (aircraftId == null || po == null || testingType == null || workflowKey == null) {
            throw ApiException.badRequest("aircraftId, poNumber, testingType, workflowKey are required");
        }
        TestingType testing;
        try {
            testing = TestingType.parse(testingType);
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("testingType must be ROUTINE or REPAIR");
        }
        WorkflowDefinition def = workflows.findDefinitionByKey(workflowKey)
                .orElseThrow(() -> ApiException.notFound("Master workflow not found: " + workflowKey));

        Instant now = AmmsDateTimes.now();
        String packageNo = "WP-" + po.trim() + "-" + now.getEpochSecond();
        if (packages.packageNoExists(packageNo)) {
            packageNo = packageNo + "-" + UUID.randomUUID().toString().substring(0, 4);
        }
        UUID id = UUID.randomUUID();
        packages.insertPackage(new WorkPackageRow(
                id, packageNo, aircraftId.trim(), po.trim(),
                so == null || so.isBlank() ? null : so.trim(),
                testing, def.id(), PackageStatus.READY,
                notes == null || notes.isBlank() ? null : notes.trim(),
                user.getId(), now, now
        ));
        return get(id);
    }

    @Transactional
    public Map<String, Object> addPart(UUID packageId, Map<String, Object> body) {
        WorkPackageRow pkg = packages.findPackage(packageId)
                .orElseThrow(() -> ApiException.notFound("Work package not found"));
        if (pkg.status().isClosed()) {
            throw ApiException.conflict("Cannot add parts to a closed package");
        }
        String partNo = str(body, "partNo");
        if (partNo == null) {
            throw ApiException.badRequest("partNo is required");
        }
        String serial = str(body, "serialNo");
        String description = str(body, "description");
        int seq = packages.nextSequence(packageId);
        UUID partId = UUID.randomUUID();
        packages.insertPart(new PartRow(
                partId, packageId, seq, partNo.trim(),
                serial == null || serial.isBlank() ? null : serial.trim(),
                description == null || description.isBlank() ? null : description.trim(),
                PartStatus.PENDING, null, null, null
        ));
        if (pkg.status() == PackageStatus.READY || pkg.status() == PackageStatus.DRAFT) {
            packages.updatePackageStatus(packageId, PackageStatus.READY);
        }
        return get(packageId);
    }

    /**
     * Open a part for testing: start master workflow instance and bind it to the part.
     */
    @Transactional
    public Map<String, Object> openPart(UUID packageId, UUID partId, UserPrincipal user) {
        WorkPackageRow pkg = packages.findPackage(packageId)
                .orElseThrow(() -> ApiException.notFound("Work package not found"));
        PartRow part = packages.findPart(partId)
                .orElseThrow(() -> ApiException.notFound("Part not found"));
        if (!part.packageId().equals(packageId)) {
            throw ApiException.notFound("Part not on this package");
        }
        if (part.instanceId() != null) {
            throw ApiException.conflict("Part already opened — continue the existing instance");
        }
        WorkflowDefinition def = workflows.findDefinitionById(pkg.workflowDefinitionId())
                .orElseThrow(() -> ApiException.conflict("Master workflow missing"));

        String businessKey = pkg.poNumber() + "-" + part.partNo()
                + (part.serialNo() != null ? "-" + part.serialNo() : "")
                + "-S" + part.sequenceNo();

        Map<String, Object> context = new LinkedHashMap<>();
        context.put("workPackageId", packageId.toString());
        context.put("partId", partId.toString());
        context.put("poNumber", pkg.poNumber());
        context.put("soNumber", pkg.soNumber());
        context.put("aircraftId", pkg.aircraftId());
        context.put("testingType", EnumCodes.code(pkg.testingType()));
        context.put("partNo", part.partNo());
        context.put("serialNo", part.serialNo());

        InstanceView started = workflowService.start(
                def.key(),
                new StartInstanceRequest(businessKey, context),
                user
        );
        packages.linkPartInstance(partId, started.instanceId());
        packages.updatePackageStatus(packageId, PackageStatus.IN_PROGRESS);

        Map<String, Object> out = get(packageId);
        out.put("openedInstanceId", started.instanceId().toString());
        out.put("openedPartId", partId.toString());
        return out;
    }

    /** Sync part status from a completed/failed instance (called after transitions). */
    @Transactional
    public void syncPartFromInstance(UUID instanceId) {
        PartRow part = packages.findPartByInstance(instanceId).orElse(null);
        if (part == null) {
            return;
        }
        WorkflowInstance instance = workflows.findInstance(instanceId).orElse(null);
        if (instance == null) {
            return;
        }
        if (instance.status() == InstanceStatus.COMPLETED) {
            packages.updatePartStatus(part.id(), PartStatus.PASSED);
            maybeCompletePackage(part.packageId());
        } else if (instance.status() == InstanceStatus.CANCELLED) {
            packages.updatePartStatus(part.id(), PartStatus.SKIPPED);
            maybeCompletePackage(part.packageId());
        }
    }

    private void maybeCompletePackage(UUID packageId) {
        List<PartRow> parts = packages.partsFor(packageId);
        if (parts.isEmpty()) {
            return;
        }
        boolean allDone = parts.stream().allMatch(p -> p.status().isTerminal());
        if (allDone) {
            packages.updatePackageStatus(packageId, PackageStatus.COMPLETED);
        }
    }

    public Map<String, Object> report(UUID packageId) {
        Map<String, Object> pkg = get(packageId);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parts = (List<Map<String, Object>>) pkg.get("parts");
        long passed = parts.stream().filter(p -> PartStatus.PASSED.name().equals(p.get("status"))).count();
        long failed = parts.stream().filter(p -> PartStatus.FAILED.name().equals(p.get("status"))).count();
        long pending = parts.stream().filter(p -> {
            Object s = p.get("status");
            return PartStatus.PENDING.name().equals(s) || PartStatus.IN_TEST.name().equals(s);
        }).count();
        Map<String, Object> report = new LinkedHashMap<>(pkg);
        report.put("summary", Map.of(
                "totalParts", parts.size(),
                "passed", passed,
                "failed", failed,
                "pending", pending
        ));
        return report;
    }

    private Map<String, Object> toPackageView(WorkPackageRow row) {
        WorkflowDefinition def = workflows.findDefinitionById(row.workflowDefinitionId()).orElse(null);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", row.id().toString());
        m.put("packageNo", row.packageNo());
        m.put("aircraftId", row.aircraftId());
        m.put("poNumber", row.poNumber());
        m.put("soNumber", row.soNumber());
        m.put("testingType", EnumCodes.code(row.testingType()));
        m.put("status", EnumCodes.code(row.status()));
        m.put("notes", row.notes());
        m.put("workflowKey", def == null ? null : def.key());
        m.put("workflowName", def == null ? null : def.name());
        m.put("createdAt", row.createdAt() == null ? null : row.createdAt().toString());
        m.put("updatedAt", row.updatedAt() == null ? null : row.updatedAt().toString());
        return m;
    }

    private Map<String, Object> toPartView(PartRow p, WorkPackageRow pkg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.id().toString());
        m.put("sequenceNo", p.sequenceNo());
        m.put("partNo", p.partNo());
        m.put("serialNo", p.serialNo());
        m.put("description", p.description());
        m.put("status", EnumCodes.code(p.status()));
        m.put("instanceId", p.instanceId() == null ? null : p.instanceId().toString());
        m.put("openedAt", p.openedAt() == null ? null : p.openedAt().toString());
        m.put("closedAt", p.closedAt() == null ? null : p.closedAt().toString());
        if (p.instanceId() != null) {
            workflows.findInstance(p.instanceId()).ifPresent(inst -> {
                m.put("instanceStatus", EnumCodes.code(inst.status()));
                m.put("currentNodeKey", inst.currentNodeKey());
                if (inst.status() == InstanceStatus.COMPLETED && p.status() == PartStatus.IN_TEST) {
                    // lazy sync for UI
                    packages.updatePartStatus(p.id(), PartStatus.PASSED);
                    m.put("status", PartStatus.PASSED.name());
                }
            });
        }
        return m;
    }

    private static String str(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        String v = String.valueOf(body.get(key)).trim();
        return v.isEmpty() || "null".equals(v) ? null : v;
    }
}
