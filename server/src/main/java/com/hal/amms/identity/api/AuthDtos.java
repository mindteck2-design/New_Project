package com.hal.amms.identity.api;

import java.util.List;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(String username, String password) {}

    public record UserResponse(UUID id, String username, String displayName, List<String> roles) {}

    public record LoginResponse(String token, UserResponse user) {}
}
