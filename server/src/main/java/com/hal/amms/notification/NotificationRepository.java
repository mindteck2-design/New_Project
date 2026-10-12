package com.hal.amms.notification;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static com.hal.amms.jooq.Tables.*;

@Repository
public class NotificationRepository {

    private final DSLContext dsl;

    public NotificationRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void insert(UUID id, UUID instanceId, String targetRole, String title, String body, String actionPath) {
        dsl.insertInto(WORKFLOW_NOTIFICATIONS)
                .columns(WORKFLOW_NOTIFICATIONS.ID, WORKFLOW_NOTIFICATIONS.INSTANCE_ID, WORKFLOW_NOTIFICATIONS.TARGET_ROLE, WORKFLOW_NOTIFICATIONS.TITLE, WORKFLOW_NOTIFICATIONS.BODY, WORKFLOW_NOTIFICATIONS.ACTION_PATH, WORKFLOW_NOTIFICATIONS.CREATED_AT)
                .values(id, instanceId, targetRole, title, body, actionPath, OffsetDateTime.now(ZoneOffset.UTC))
                .execute();
    }

    public List<Record> listForRoles(Collection<String> roles, UUID userId, int limit) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }
        var readExists = DSL.exists(
                dsl.selectOne()
                        .from(NOTIFICATION_READS)
                        .where(NOTIFICATION_READS.NOTIFICATION_ID.eq(WORKFLOW_NOTIFICATIONS.ID).and(NOTIFICATION_READS.USER_ID.eq(userId)))
        );
        // Explicit field list — chaining .select(table.fields()).select(extra) replaces the select list in jOOQ.
        return dsl.select(
                        WORKFLOW_NOTIFICATIONS.ID,
                        WORKFLOW_NOTIFICATIONS.INSTANCE_ID,
                        WORKFLOW_NOTIFICATIONS.TARGET_ROLE,
                        WORKFLOW_NOTIFICATIONS.TITLE,
                        WORKFLOW_NOTIFICATIONS.BODY,
                        WORKFLOW_NOTIFICATIONS.ACTION_PATH,
                        WORKFLOW_NOTIFICATIONS.CREATED_AT,
                        readExists.as("is_read")
                )
                .from(WORKFLOW_NOTIFICATIONS)
                .where(WORKFLOW_NOTIFICATIONS.TARGET_ROLE.in(roles))
                .orderBy(WORKFLOW_NOTIFICATIONS.CREATED_AT.desc())
                .limit(limit)
                .fetch()
                .map(r -> (Record) r);
    }

    public void markRead(UUID notificationId, UUID userId) {
        dsl.insertInto(NOTIFICATION_READS)
                .columns(NOTIFICATION_READS.NOTIFICATION_ID, NOTIFICATION_READS.USER_ID, NOTIFICATION_READS.READ_AT)
                .values(notificationId, userId, OffsetDateTime.now(ZoneOffset.UTC))
                .onConflict(NOTIFICATION_READS.NOTIFICATION_ID, NOTIFICATION_READS.USER_ID)
                .doNothing()
                .execute();
    }

    public boolean exists(UUID notificationId) {
        return dsl.fetchExists(
                dsl.selectOne().from(WORKFLOW_NOTIFICATIONS).where(WORKFLOW_NOTIFICATIONS.ID.eq(notificationId))
        );
    }
}
