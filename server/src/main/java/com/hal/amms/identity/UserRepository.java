package com.hal.amms.identity;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.jooq.Tables.*;

@Repository
public class UserRepository {

    private final DSLContext dsl;

    public UserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Optional<UserRecord> findByUsername(String username) {
        return dsl.select(USERS.ID, USERS.USERNAME, USERS.PASSWORD_HASH, USERS.DISPLAY_NAME, USERS.ACTIVE)
                .from(USERS)
                .where(USERS.USERNAME.eq(username))
                .fetchOptional()
                .map(r -> new UserRecord(
                        r.get(USERS.ID),
                        r.get(USERS.USERNAME),
                        r.get(USERS.PASSWORD_HASH),
                        r.get(USERS.DISPLAY_NAME),
                        Boolean.TRUE.equals(r.get(USERS.ACTIVE)),
                        roleCodes(r.get(USERS.ID))
                ));
    }

    public Optional<UserRecord> findById(UUID id) {
        return dsl.select(USERS.ID, USERS.USERNAME, USERS.PASSWORD_HASH, USERS.DISPLAY_NAME, USERS.ACTIVE)
                .from(USERS)
                .where(USERS.ID.eq(id))
                .fetchOptional()
                .map(r -> new UserRecord(
                        r.get(USERS.ID),
                        r.get(USERS.USERNAME),
                        r.get(USERS.PASSWORD_HASH),
                        r.get(USERS.DISPLAY_NAME),
                        Boolean.TRUE.equals(r.get(USERS.ACTIVE)),
                        roleCodes(r.get(USERS.ID))
                ));
    }

    public boolean existsByUsername(String username) {
        return dsl.fetchExists(dsl.selectOne().from(USERS).where(USERS.USERNAME.eq(username)));
    }

    public void insertUser(UUID id, String username, String passwordHash, String displayName) {
        dsl.insertInto(USERS)
                .columns(USERS.ID, USERS.USERNAME, USERS.PASSWORD_HASH, USERS.DISPLAY_NAME, USERS.ACTIVE)
                .values(id, username, passwordHash, displayName, true)
                .execute();
    }

    public void linkRole(UUID userId, String roleCode) {
        UUID roleId = dsl.select(ROLES.ID).from(ROLES).where(ROLES.CODE.eq(roleCode)).fetchOne(ROLES.ID);
        if (roleId == null) {
            throw new IllegalStateException("Unknown role: " + roleCode);
        }
        boolean exists = dsl.fetchExists(
                dsl.selectOne().from(USER_ROLES)
                        .where(USER_ROLES.USER_ID.eq(userId).and(USER_ROLES.ROLE_ID.eq(roleId)))
        );
        if (!exists) {
            dsl.insertInto(USER_ROLES)
                    .columns(USER_ROLES.USER_ID, USER_ROLES.ROLE_ID)
                    .values(userId, roleId)
                    .execute();
        }
    }

    public List<String> listRoleCodes() {
        return dsl.select(ROLES.CODE).from(ROLES).orderBy(ROLES.CODE.asc()).fetch(ROLES.CODE);
    }

    private List<String> roleCodes(UUID userId) {
        return dsl.select(ROLES.CODE)
                .from(USER_ROLES)
                .join(ROLES).on(ROLES.ID.eq(USER_ROLES.ROLE_ID))
                .where(USER_ROLES.USER_ID.eq(userId))
                .orderBy(ROLES.CODE.asc())
                .fetch(ROLES.CODE);
    }
}
