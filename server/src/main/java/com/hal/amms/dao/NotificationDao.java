package com.hal.amms.dao;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static com.hal.amms.db.Tables.*;

@Repository
public class NotificationDao {

    private final DSLContext dsl;

    public NotificationDao(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void insert(UUID id, UUID instanceId, String targetRole, String title, String body, String actionPath) {
        dsl.insertInto(WORKFLOW_NOTIFICATIONS)
                .columns(WFN_ID, WFN_INSTANCE_ID, WFN_TARGET_ROLE, WFN_TITLE, WFN_BODY, WFN_ACTION_PATH, WFN_CREATED_AT)
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
                        .where(NR_NOTIFICATION_ID.eq(WFN_ID).and(NR_USER_ID.eq(userId)))
        );
        // Explicit field list — chaining .select(table.fields()).select(extra) replaces the select list in jOOQ.
        return dsl.select(
                        WFN_ID,
                        WFN_INSTANCE_ID,
                        WFN_TARGET_ROLE,
                        WFN_TITLE,
                        WFN_BODY,
                        WFN_ACTION_PATH,
                        WFN_CREATED_AT,
                        readExists.as("is_read")
                )
                .from(WORKFLOW_NOTIFICATIONS)
                .where(WFN_TARGET_ROLE.in(roles))
                .orderBy(WFN_CREATED_AT.desc())
                .limit(limit)
                .fetch()
                .map(r -> (Record) r);
    }

    public void markRead(UUID notificationId, UUID userId) {
        dsl.insertInto(NOTIFICATION_READS)
                .columns(NR_NOTIFICATION_ID, NR_USER_ID, NR_READ_AT)
                .values(notificationId, userId, OffsetDateTime.now(ZoneOffset.UTC))
                .onConflict(NR_NOTIFICATION_ID, NR_USER_ID)
                .doNothing()
                .execute();
    }

    public boolean exists(UUID notificationId) {
        return dsl.fetchExists(
                dsl.selectOne().from(WORKFLOW_NOTIFICATIONS).where(WFN_ID.eq(notificationId))
        );
    }
}
