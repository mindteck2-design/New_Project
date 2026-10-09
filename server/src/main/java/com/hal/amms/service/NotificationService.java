package com.hal.amms.service;

import com.hal.amms.dao.NotificationDao;
import com.hal.amms.security.UserPrincipal;
import com.hal.amms.web.ApiException;
import com.hal.amms.web.dto.ApiDtos.NotificationView;
import org.jooq.Record;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.hal.amms.db.Tables.*;

@Service
public class NotificationService {

    private final NotificationDao dao;

    public NotificationService(NotificationDao dao) {
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
        OffsetDateTime created = r.get(WFN_CREATED_AT);
        Boolean read = r.get("is_read", Boolean.class);
        return new NotificationView(
                r.get(WFN_ID),
                r.get(WFN_INSTANCE_ID),
                r.get(WFN_TARGET_ROLE),
                r.get(WFN_TITLE),
                r.get(WFN_BODY),
                r.get(WFN_ACTION_PATH),
                Boolean.TRUE.equals(read),
                created == null ? Instant.now() : created.toInstant()
        );
    }
}
