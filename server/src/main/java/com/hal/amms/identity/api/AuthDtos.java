package com.hal.amms.identity.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(String username, String password) {}

    public record UserResponse(UUID id, String username, String displayName, List<String> roles,
                               boolean mustChangePassword) {}

    public record LoginResponse(String token, UserResponse user) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 12, max = 72) String newPassword
    ) {}
}
