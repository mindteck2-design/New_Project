package com.hal.amms.identity;

import java.util.List;
import java.util.UUID;

public record UserAdminRecord(
        UUID id,
        String username,
        String displayName,
        boolean active,
        boolean mustChangePassword,
        List<String> roles
) {}
