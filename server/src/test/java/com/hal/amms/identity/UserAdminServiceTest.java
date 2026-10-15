package com.hal.amms.identity;

import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.platform.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserAdminServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final UserAdminRepository adminUsers = mock(UserAdminRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final UserAdminService service = new UserAdminService(
            users, adminUsers, passwordEncoder, JsonMapper.builder().build());

    @Test
    void lastActiveAdministratorCannotBeDemotedOrDeactivated() {
        UUID id = UUID.randomUUID();
        UserAdminRecord administrator = new UserAdminRecord(
                id, "admin", "System Administrator", true, false, List.of("ADMIN"));
        UserPrincipal actor = new UserPrincipal(id, "admin", "hash", "System Administrator",
                List.of("ADMIN"), true, false);
        when(adminUsers.findById(id)).thenReturn(Optional.of(administrator));
        when(adminUsers.countActiveAdmins()).thenReturn(1L);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.update(actor, id, "Changed Name", List.of("PROGRESS"), false));

        assertEquals(409, exception.getStatus().value());
        verify(users, never()).updateAccount(id, "Changed Name", false);
        verify(users, never()).replaceRoles(id, List.of("PROGRESS"));
        verify(adminUsers, never()).insertAudit(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void roleCodesAreValidatedBeforeAnyAccountMutation() {
        UUID actorId = UUID.randomUUID();
        UserPrincipal actor = new UserPrincipal(actorId, "admin", "hash", "System Administrator",
                List.of("ADMIN"), true, false);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.create(actor, "new.user", "New User",
                        List.of("NOT_A_ROLE"), "temporary-password-123"));

        assertEquals(400, exception.getStatus().value());
        verify(users, never()).insertUser(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void duplicateUsernameIsRejectedBeforeAccountMutation() {
        UUID actorId = UUID.randomUUID();
        UserPrincipal actor = new UserPrincipal(actorId, "admin", "hash", "System Administrator",
                List.of("ADMIN"), true, false);
        when(users.existsByUsername("existing.user")).thenReturn(true);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.create(actor, "existing.user", "Existing User",
                        List.of("PROGRESS"), "temporary-password-123"));

        assertEquals(409, exception.getStatus().value());
        verify(users, never()).insertUser(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean());
        verify(adminUsers, never()).insertAudit(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void administratorCannotResetTheirOwnPasswordThroughAdminResetPath() {
        UUID actorId = UUID.randomUUID();
        UserPrincipal actor = new UserPrincipal(actorId, "admin", "hash", "System Administrator",
                List.of("ADMIN"), true, false);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.resetPassword(actor, actorId, "temporary-password-123"));

        assertEquals(409, exception.getStatus().value());
        verify(users, never()).updatePasswordHash(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean());
        verify(adminUsers, never()).insertAudit(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }
}
