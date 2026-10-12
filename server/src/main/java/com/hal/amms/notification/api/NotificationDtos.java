package com.hal.amms.notification.api;

import java.time.Instant;
import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos() {}

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
}
