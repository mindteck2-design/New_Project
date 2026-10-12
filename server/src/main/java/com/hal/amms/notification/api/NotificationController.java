package com.hal.amms.notification.api;

import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.notification.NotificationService;
import com.hal.amms.notification.api.NotificationDtos.NotificationView;
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
