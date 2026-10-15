package com.hal.amms.identity;

import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.platform.web.ApiException;
import org.jooq.exception.IntegrityConstraintViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.UUID;

@Service
public class UserAdminService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository users;
    private final UserAdminRepository adminUsers;
    private final PasswordEncoder passwordEncoder;
    private final JsonMapper jsonMapper;

    public UserAdminService(UserRepository users, UserAdminRepository adminUsers,
                            PasswordEncoder passwordEncoder, JsonMapper jsonMapper) {
        this.users = users;
        this.adminUsers = adminUsers;
        this.passwordEncoder = passwordEncoder;
        this.jsonMapper = jsonMapper;
    }

    @Transactional(readOnly = true)
    public UserPage list(int page, int size, Boolean active, String roleCode, String search) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE || page > Integer.MAX_VALUE / size) {
            throw ApiException.badRequest("Page must be non-negative and size must be between 1 and 100");
        }
        if (search != null && search.trim().length() > 100) {
            throw ApiException.badRequest("Search text must not exceed 100 characters");
        }
        String normalizedRole = roleCode == null || roleCode.isBlank()
                ? null : normalizeRoles(List.of(roleCode)).getFirst();
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim();
        return new UserPage(adminUsers.findUsers(page * size, size, active, normalizedRole, normalizedSearch),
                page, size, adminUsers.countUsers(active, normalizedRole, normalizedSearch));
    }

    @Transactional(readOnly = true)
    public UserAdminRecord get(UUID userId) {
        return adminUsers.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
    }

    @Transactional
    public UserAdminRecord create(UserPrincipal actor, String username, String displayName,
                                  List<String> roleCodes, String temporaryPassword) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedDisplayName = normalizeDisplayName(displayName);
        List<String> roles = normalizeRoles(roleCodes);
        validatePassword(temporaryPassword);
        if (users.existsByUsername(normalizedUsername)) {
            throw ApiException.conflict("Username already exists");
        }

        adminUsers.lockAdminRole();
        UUID userId = UUID.randomUUID();
        try {
            users.insertUser(userId, normalizedUsername, passwordEncoder.encode(temporaryPassword),
                    normalizedDisplayName, true);
            users.replaceRoles(userId, roles);
        } catch (IntegrityConstraintViolationException ex) {
            if ("23505".equals(ex.sqlState())) {
                throw ApiException.conflict("Username already exists");
            }
            throw ex;
        }

        UserAdminRecord created = get(userId);
        writeAudit(actor.getId(), userId, "USER_CREATED", null, snapshot(created));
        return created;
    }

    @Transactional
    public UserAdminRecord update(UserPrincipal actor, UUID userId, String displayName,
                                  List<String> roleCodes, boolean active) {
        String normalizedDisplayName = normalizeDisplayName(displayName);
        List<String> roles = normalizeRoles(roleCodes);
        adminUsers.lockAdminRole();
        UserAdminRecord before = get(userId);
        boolean wasActiveAdmin = before.active() && before.roles().contains(AmmsRole.ADMIN.name());
        boolean remainsActiveAdmin = active && roles.contains(AmmsRole.ADMIN.name());
        if (wasActiveAdmin && !remainsActiveAdmin && adminUsers.countActiveAdmins() <= 1) {
            throw ApiException.conflict("The last active administrator cannot be deactivated or demoted");
        }

        users.updateAccount(userId, normalizedDisplayName, active);
        users.replaceRoles(userId, roles);
        UserAdminRecord updated = get(userId);
        String action = before.active() && !active ? "USER_DEACTIVATED"
                : !before.active() && active ? "USER_ACTIVATED"
                : !before.roles().equals(updated.roles()) ? "USER_ROLES_UPDATED"
                : "USER_UPDATED";
        writeAudit(actor.getId(), userId, action, snapshot(before), snapshot(updated));
        return updated;
    }

    @Transactional
    public UserAdminRecord resetPassword(UserPrincipal actor, UUID userId, String temporaryPassword) {
        validatePassword(temporaryPassword);
        adminUsers.lockAdminRole();
        if (actor.getId().equals(userId)) {
            throw ApiException.conflict("Use the password change page to update your own password");
        }
        UserAdminRecord before = get(userId);
        if (!before.active()) {
            throw ApiException.conflict("An inactive account cannot have its password reset");
        }
        users.updatePasswordHash(userId, passwordEncoder.encode(temporaryPassword), true);
        UserAdminRecord updated = get(userId);
        writeAudit(actor.getId(), userId, "PASSWORD_RESET",
                Map.of("mustChangePassword", before.mustChangePassword()),
                Map.of("mustChangePassword", true));
        return updated;
    }

    @Transactional
    public UserAdminRecord changeOwnPassword(UserPrincipal actor, String currentPassword, String newPassword) {
        validatePassword(newPassword);
        UserRecord account = users.findById(actor.getId())
                .orElseThrow(() -> ApiException.unauthorized("Account is no longer available"));
        if (!account.active()) {
            throw ApiException.unauthorized("Account is inactive");
        }
        if (!passwordEncoder.matches(currentPassword, account.passwordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        if (passwordEncoder.matches(newPassword, account.passwordHash())) {
            throw ApiException.badRequest("New password must be different from the current password");
        }
        users.updatePasswordHash(actor.getId(), passwordEncoder.encode(newPassword), false);
        writeAudit(actor.getId(), actor.getId(), "PASSWORD_CHANGED",
                Map.of("mustChangePassword", account.mustChangePassword()),
                Map.of("mustChangePassword", false));
        UserRecord updated = users.findById(actor.getId())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        return new UserAdminRecord(updated.id(), updated.username(), updated.displayName(), updated.active(),
                updated.mustChangePassword(), updated.roles());
    }

    @Transactional
    public UserAdminRecord bootstrapAdmin(String username, String temporaryPassword) {
        validatePassword(temporaryPassword);
        adminUsers.lockAdminRole();
        if (adminUsers.countAdmins() > 0) {
            throw new IllegalStateException("An administrator account already exists; remove bootstrap credentials");
        }
        String normalizedUsername = normalizeUsername(username);
        if (users.existsByUsername(normalizedUsername)) {
            throw ApiException.conflict("Bootstrap username already exists without the ADMIN role");
        }
        UUID userId = UUID.randomUUID();
        users.insertUser(userId, normalizedUsername, passwordEncoder.encode(temporaryPassword),
                "System Administrator", true);
        users.replaceRoles(userId, List.of(AmmsRole.ADMIN.name()));
        UserAdminRecord created = get(userId);
        writeAudit(null, userId, "SYSTEM_BOOTSTRAP", null, snapshot(created));
        return created;
    }

    private List<String> normalizeRoles(List<String> roleCodes) {
        if (roleCodes == null || roleCodes.isEmpty()) {
            throw ApiException.badRequest("At least one role is required");
        }
        TreeSet<String> normalized = new TreeSet<>();
        for (String roleCode : roleCodes) {
            AmmsRole role = AmmsRole.tryParse(roleCode)
                    .orElseThrow(() -> ApiException.badRequest("Unsupported role: " + roleCode));
            normalized.add(role.name());
        }
        return new ArrayList<>(normalized);
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank() || username.trim().length() > 100) {
            throw ApiException.badRequest("Username is required and must not exceed 100 characters");
        }
        return username.trim();
    }

    private String normalizeDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank() || displayName.trim().length() > 200) {
            throw ApiException.badRequest("Display name is required and must not exceed 200 characters");
        }
        return displayName.trim();
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 12
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw ApiException.badRequest(
                    "Password must be at least 12 characters and no more than 72 UTF-8 bytes");
        }
    }

    private Map<String, Object> snapshot(UserAdminRecord user) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("username", user.username());
        snapshot.put("displayName", user.displayName());
        snapshot.put("active", user.active());
        snapshot.put("mustChangePassword", user.mustChangePassword());
        snapshot.put("roles", user.roles());
        return snapshot;
    }

    private void writeAudit(UUID actorId, UUID targetId, String action,
                            Map<String, Object> before, Map<String, Object> after) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", before);
        changes.put("after", after);
        String serialized;
        try {
            serialized = jsonMapper.writeValueAsString(changes);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not serialize user administration audit event", ex);
        }
        adminUsers.insertAudit(UUID.randomUUID(), actorId, targetId, action, serialized);
    }

    public record UserPage(List<UserAdminRecord> items, int page, int size, long total) {}
}
