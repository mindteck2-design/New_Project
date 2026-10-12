package com.hal.amms.identity;

import com.hal.amms.shared.EnumCodes;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public enum AmmsRole {
    PROGRESS,
    INSPECTION,
    QA,
    STORES,
    CUSTOMER,
    SHOP_MANAGER,
    ADMIN;

    public static AmmsRole parse(String raw) {
        return EnumCodes.parse(AmmsRole.class, raw);
    }

    public static Optional<AmmsRole> tryParse(String raw) {
        return EnumCodes.tryParse(AmmsRole.class, raw);
    }

    public static Set<AmmsRole> parseAll(Iterable<String> rawRoles) {
        if (rawRoles == null) {
            return Set.of();
        }
        return java.util.stream.StreamSupport.stream(rawRoles.spliterator(), false)
                .map(AmmsRole::tryParse)
                .flatMap(Optional::stream)
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean matches(String raw) {
        return tryParse(raw).filter(this::equals).isPresent();
    }

    public static boolean userHasAny(Iterable<String> userRoles, AmmsRole... needed) {
        if (needed == null || needed.length == 0) {
            return false;
        }
        Set<AmmsRole> have = parseAll(userRoles);
        return Arrays.stream(needed).anyMatch(have::contains);
    }

    public static boolean userHas(Iterable<String> userRoles, String neededRoleCode) {
        Optional<AmmsRole> needed = tryParse(neededRoleCode);
        if (needed.isEmpty()) {
            // Unknown/custom role codes: fall back to case-insensitive string match.
            if (neededRoleCode == null || neededRoleCode.isBlank()) {
                return true;
            }
            String want = neededRoleCode.trim().toUpperCase(Locale.ROOT);
            for (String r : userRoles) {
                if (r != null && r.trim().toUpperCase(Locale.ROOT).equals(want)) {
                    return true;
                }
            }
            return false;
        }
        return userHasAny(userRoles, needed.get());
    }
}
