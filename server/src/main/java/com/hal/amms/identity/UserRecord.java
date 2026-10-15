package com.hal.amms.identity;

import java.util.List;
import java.util.UUID;

public record UserRecord(
        UUID id,
        String username,
        String passwordHash,
        String displayName,
        boolean active,
        boolean mustChangePassword,
        List<String> roles
) {}
