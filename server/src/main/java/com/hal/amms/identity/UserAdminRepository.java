package com.hal.amms.identity;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.jooq.Tables.*;
import static org.jooq.impl.DSL.exists;
import static org.jooq.impl.DSL.noCondition;
import static org.jooq.impl.DSL.selectOne;

@Repository
public class UserAdminRepository {

    private final DSLContext dsl;

    public UserAdminRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<UserAdminRecord> findUsers(int offset, int limit, Boolean active, String roleCode, String search) {
        Condition condition = userCondition(active, roleCode, search);
        var rows = dsl.select(USERS.ID, USERS.USERNAME, USERS.DISPLAY_NAME, USERS.ACTIVE,
                        USERS.MUST_CHANGE_PASSWORD)
                .from(USERS)
                .where(condition)
                .orderBy(USERS.USERNAME.asc(), USERS.ID.asc())
                .limit(limit)
                .offset(offset)
                .fetch();
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> userIds = rows.getValues(USERS.ID);
        Map<UUID, List<String>> rolesByUser = new HashMap<>();
        dsl.select(USER_ROLES.USER_ID, ROLES.CODE)
                .from(USER_ROLES)
                .join(ROLES).on(ROLES.ID.eq(USER_ROLES.ROLE_ID))
                .where(USER_ROLES.USER_ID.in(userIds))
                .orderBy(USER_ROLES.USER_ID.asc(), ROLES.CODE.asc())
                .fetch()
                .forEach(row -> rolesByUser
                        .computeIfAbsent(row.get(USER_ROLES.USER_ID), ignored -> new ArrayList<>())
                        .add(row.get(ROLES.CODE)));
        return rows.map(row -> toUser(row.get(USERS.ID), row.get(USERS.USERNAME),
                row.get(USERS.DISPLAY_NAME), row.get(USERS.ACTIVE),
                row.get(USERS.MUST_CHANGE_PASSWORD), rolesByUser.getOrDefault(row.get(USERS.ID), List.of())));
    }

    public long countUsers(Boolean active, String roleCode, String search) {
        Condition condition = userCondition(active, roleCode, search);
        Integer count = dsl.selectCount().from(USERS).where(condition).fetchOne(0, Integer.class);
        return count == null ? 0 : count;
    }

    private Condition userCondition(Boolean active, String roleCode, String search) {
        Condition condition = noCondition();
        if (active != null) {
            condition = condition.and(USERS.ACTIVE.eq(active));
        }
        if (roleCode != null) {
            condition = condition.and(exists(
                    selectOne()
                            .from(USER_ROLES)
                            .join(ROLES).on(ROLES.ID.eq(USER_ROLES.ROLE_ID))
                            .where(USER_ROLES.USER_ID.eq(USERS.ID).and(ROLES.CODE.eq(roleCode)))
            ));
        }
        if (search != null && !search.isBlank()) {
            condition = condition.and(USERS.USERNAME.containsIgnoreCase(search)
                    .or(USERS.DISPLAY_NAME.containsIgnoreCase(search)));
        }
        return condition;
    }

    public Optional<UserAdminRecord> findById(UUID id) {
        return dsl.select(USERS.ID, USERS.USERNAME, USERS.DISPLAY_NAME, USERS.ACTIVE,
                        USERS.MUST_CHANGE_PASSWORD)
                .from(USERS)
                .where(USERS.ID.eq(id))
                .fetchOptional()
                .map(row -> toUser(row.get(USERS.ID), row.get(USERS.USERNAME),
                        row.get(USERS.DISPLAY_NAME), row.get(USERS.ACTIVE),
                        row.get(USERS.MUST_CHANGE_PASSWORD)));
    }

    public void lockAdminRole() {
        dsl.select(ROLES.ID)
                .from(ROLES)
                .where(ROLES.CODE.eq(AmmsRole.ADMIN.name()))
                .forUpdate()
                .fetchOptional()
                .orElseThrow(() -> new IllegalStateException("ADMIN role is not seeded"));
    }

    public long countActiveAdmins() {
        Integer count = dsl.selectCount()
                .from(USERS)
                .join(USER_ROLES).on(USER_ROLES.USER_ID.eq(USERS.ID))
                .join(ROLES).on(ROLES.ID.eq(USER_ROLES.ROLE_ID))
                .where(USERS.ACTIVE.isTrue().and(ROLES.CODE.eq(AmmsRole.ADMIN.name())))
                .fetchOne(0, Integer.class);
        return count == null ? 0 : count;
    }

    public long countAdmins() {
        Integer count = dsl.selectCount()
                .from(USER_ROLES)
                .join(ROLES).on(ROLES.ID.eq(USER_ROLES.ROLE_ID))
                .where(ROLES.CODE.eq(AmmsRole.ADMIN.name()))
                .fetchOne(0, Integer.class);
        return count == null ? 0 : count;
    }

    public void insertAudit(UUID id, UUID actorId, UUID targetId, String action, String changesJson) {
        dsl.insertInto(USER_ADMIN_AUDIT_LOGS)
                .columns(USER_ADMIN_AUDIT_LOGS.ID, USER_ADMIN_AUDIT_LOGS.ACTOR_USER_ID,
                        USER_ADMIN_AUDIT_LOGS.TARGET_USER_ID, USER_ADMIN_AUDIT_LOGS.ACTION,
                        USER_ADMIN_AUDIT_LOGS.CHANGES_JSON)
                .values(id, actorId, targetId, action, changesJson == null ? null : JSONB.valueOf(changesJson))
                .execute();
    }

    private UserAdminRecord toUser(UUID id, String username, String displayName,
                                   Boolean active, Boolean mustChangePassword) {
        List<String> roles = dsl.select(ROLES.CODE)
                .from(USER_ROLES)
                .join(ROLES).on(ROLES.ID.eq(USER_ROLES.ROLE_ID))
                .where(USER_ROLES.USER_ID.eq(id))
                .orderBy(ROLES.CODE.asc())
                .fetch(ROLES.CODE);
        return toUser(id, username, displayName, active, mustChangePassword, roles);
    }

    private UserAdminRecord toUser(UUID id, String username, String displayName,
                                   Boolean active, Boolean mustChangePassword, List<String> roles) {
        return new UserAdminRecord(id, username, displayName, Boolean.TRUE.equals(active),
                Boolean.TRUE.equals(mustChangePassword), roles);
    }
}
