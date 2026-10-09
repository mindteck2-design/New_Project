package com.hal.amms.web;

import com.hal.amms.security.UserPrincipal;
import com.hal.amms.service.NotificationService;
import com.hal.amms.web.dto.ApiDtos.NotificationView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationView> list(@AuthenticationPrincipal UserPrincipal user) {
        return notificationService.listForUser(user);
    }

    @PostMapping("/{id}/read")
    public Map<String, String> markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        notificationService.markRead(id, user);
        return Map.of("status", "OK");
    }
}
