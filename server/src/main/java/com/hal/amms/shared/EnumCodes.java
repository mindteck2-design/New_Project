package com.hal.amms.shared;

import java.util.Locale;
import java.util.Optional;

/** Shared parse helpers for DB/API string ↔ enum conversion. */
public final class EnumCodes {
    private EnumCodes() {}

    public static <E extends Enum<E>> E parse(Class<E> type, String raw) {
        return tryParse(type, raw).orElseThrow(() ->
                new IllegalArgumentException("Unknown " + type.getSimpleName() + ": " + raw));
    }

    public static <E extends Enum<E>> Optional<E> tryParse(Class<E> type, String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Enum.valueOf(type, raw.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public static String code(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
