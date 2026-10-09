package com.hal.amms.dao;

import com.hal.amms.model.Models.UserRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.db.Tables.*;

@Repository
public class UserDao {

    private final DSLContext dsl;

    public UserDao(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Optional<UserRecord> findByUsername(String username) {
        return dsl.select(USERS_ID, USERS_USERNAME, USERS_PASSWORD_HASH, USERS_DISPLAY_NAME, USERS_ACTIVE)
                .from(USERS)
                .where(USERS_USERNAME.eq(username))
                .fetchOptional()
                .map(r -> new UserRecord(
                        r.get(USERS_ID),
                        r.get(USERS_USERNAME),
                        r.get(USERS_PASSWORD_HASH),
                        r.get(USERS_DISPLAY_NAME),
                        Boolean.TRUE.equals(r.get(USERS_ACTIVE)),
                        roleCodes(r.get(USERS_ID))
                ));
    }

    public Optional<UserRecord> findById(UUID id) {
        return dsl.select(USERS_ID, USERS_USERNAME, USERS_PASSWORD_HASH, USERS_DISPLAY_NAME, USERS_ACTIVE)
                .from(USERS)
                .where(USERS_ID.eq(id))
                .fetchOptional()
                .map(r -> new UserRecord(
                        r.get(USERS_ID),
                        r.get(USERS_USERNAME),
                        r.get(USERS_PASSWORD_HASH),
                        r.get(USERS_DISPLAY_NAME),
                        Boolean.TRUE.equals(r.get(USERS_ACTIVE)),
                        roleCodes(r.get(USERS_ID))
                ));
    }

    public boolean existsByUsername(String username) {
        return dsl.fetchExists(dsl.selectOne().from(USERS).where(USERS_USERNAME.eq(username)));
    }

    public void insertUser(UUID id, String username, String passwordHash, String displayName) {
        dsl.insertInto(USERS)
                .columns(USERS_ID, USERS_USERNAME, USERS_PASSWORD_HASH, USERS_DISPLAY_NAME, USERS_ACTIVE)
                .values(id, username, passwordHash, displayName, true)
                .execute();
    }

    public void linkRole(UUID userId, String roleCode) {
        UUID roleId = dsl.select(ROLES_ID).from(ROLES).where(ROLES_CODE.eq(roleCode)).fetchOne(ROLES_ID);
        if (roleId == null) {
            throw new IllegalStateException("Unknown role: " + roleCode);
        }
        boolean exists = dsl.fetchExists(
                dsl.selectOne().from(USER_ROLES)
                        .where(USER_ROLES_USER_ID.eq(userId).and(USER_ROLES_ROLE_ID.eq(roleId)))
        );
        if (!exists) {
            dsl.insertInto(USER_ROLES)
                    .columns(USER_ROLES_USER_ID, USER_ROLES_ROLE_ID)
                    .values(userId, roleId)
                    .execute();
        }
    }

    public List<String> listRoleCodes() {
        return dsl.select(ROLES_CODE).from(ROLES).orderBy(ROLES_CODE.asc()).fetch(ROLES_CODE);
    }

    private List<String> roleCodes(UUID userId) {
        return dsl.select(ROLES_CODE)
                .from(USER_ROLES)
                .join(ROLES).on(ROLES_ID.eq(USER_ROLES_ROLE_ID))
                .where(USER_ROLES_USER_ID.eq(userId))
                .orderBy(ROLES_CODE.asc())
                .fetch(ROLES_CODE);
    }
}
