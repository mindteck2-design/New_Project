package com.hal.amms.workpackage.api;

import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.workpackage.WorkPackageService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Aircraft / accessory work packages: PO/SO header + part-by-part testing
 * against a master workflow (ROUTINE or REPAIR).
 */
@RestController
@RequestMapping("/api/v1/packages")
public class WorkPackageController {

    private final WorkPackageService packages;

    public WorkPackageController(WorkPackageService packages) {
        this.packages = packages;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return packages.list();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        return packages.get(id);
    }

    @PostMapping
    public Map<String, Object> create(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return packages.create(body, user);
    }

    @PostMapping("/{id}/parts")
    public Map<String, Object> addPart(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body
    ) {
        return packages.addPart(id, body);
    }

    @PostMapping("/{id}/parts/{partId}/open")
    public Map<String, Object> openPart(
            @PathVariable UUID id,
            @PathVariable UUID partId,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return packages.openPart(id, partId, user);
    }

    @GetMapping("/{id}/report")
    public Map<String, Object> report(@PathVariable UUID id) {
        return packages.report(id);
    }
}
