package com.hal.amms.notification;

import com.hal.amms.notification.NotificationRepository;
import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.platform.web.ApiException;
import com.hal.amms.shared.AmmsDateTimes;
import com.hal.amms.notification.api.NotificationDtos.NotificationView;
import org.jooq.Record;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.hal.amms.jooq.Tables.*;

@Service
public class NotificationService {

    private final NotificationRepository dao;

    public NotificationService(NotificationRepository dao) {
        this.dao = dao;
    }

    @Transactional
    public void notifyRole(UUID instanceId, String roleCode, String title, String body) {
        if (roleCode == null || roleCode.isBlank()) {
            return;
        }
        dao.insert(
                UUID.randomUUID(),
                instanceId,
                roleCode.toUpperCase(Locale.ROOT),
                title,
                body,
                "/instances/" + instanceId
        );
    }

    public List<NotificationView> listForUser(UserPrincipal user) {
        List<String> roles = user.getRoles().stream()
                .map(r -> r.toUpperCase(Locale.ROOT))
                .toList();
        return dao.listForRoles(roles, user.getId(), 50).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public void markRead(UUID notificationId, UserPrincipal user) {
        if (!dao.exists(notificationId)) {
            throw ApiException.notFound("Notification not found");
        }
        dao.markRead(notificationId, user.getId());
    }

    private NotificationView toView(Record r) {
        OffsetDateTime created = r.get(WORKFLOW_NOTIFICATIONS.CREATED_AT);
        Boolean read = r.get("is_read", Boolean.class);
        return new NotificationView(
                r.get(WORKFLOW_NOTIFICATIONS.ID),
                r.get(WORKFLOW_NOTIFICATIONS.INSTANCE_ID),
                r.get(WORKFLOW_NOTIFICATIONS.TARGET_ROLE),
                r.get(WORKFLOW_NOTIFICATIONS.TITLE),
                r.get(WORKFLOW_NOTIFICATIONS.BODY),
                r.get(WORKFLOW_NOTIFICATIONS.ACTION_PATH),
                Boolean.TRUE.equals(read),
                created == null ? AmmsDateTimes.now() : AmmsDateTimes.toInstant(created)
        );
    }
}
