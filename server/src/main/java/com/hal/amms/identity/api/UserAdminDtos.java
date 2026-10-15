package com.hal.amms.identity.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class UserAdminDtos {
    private UserAdminDtos() {}

    public record UserResponse(UUID id, String username, String displayName, boolean active,
                               boolean mustChangePassword, List<String> roles) {}

    public record UserPageResponse(List<UserResponse> items, int page, int size, long total) {}

    public record CreateUserRequest(
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(max = 200) String displayName,
            @NotEmpty List<@NotBlank String> roles,
            @NotBlank @Size(min = 12, max = 72) String temporaryPassword
    ) {}

    public record UpdateUserRequest(
            @NotBlank @Size(max = 200) String displayName,
            @NotEmpty List<@NotBlank String> roles,
            @NotNull Boolean active
    ) {}

    public record ResetPasswordRequest(
            @NotBlank @Size(min = 12, max = 72) String temporaryPassword
    ) {}
}
