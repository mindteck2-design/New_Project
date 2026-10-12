package com.hal.amms.shared;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Single source of truth for AMMS date/time handling.
 *
 * <ul>
 *   <li><b>Calendar dates</b> (DOB, schedule day): {@link LocalDate} / {@code YYYY-MM-DD} — never Instant.</li>
 *   <li><b>Timestamps</b> (audit, createdAt): {@link Instant} in UTC — ISO-8601 with {@code Z}.</li>
 * </ul>
 *
 * <p>Storing a calendar date as a midnight Instant is what causes the classic
 * “saved 1 Aug, retrieved 2 Aug” off-by-one when clients apply local TZ conversion.
 */
public final class AmmsDateTimes {
    public static final ZoneOffset ZONE = ZoneOffset.UTC;
    public static final DateTimeFormatter CALENDAR_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private static final Pattern ISO_DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}");
    private static final Pattern ISO_INSTANT_PREFIX = Pattern.compile(
            "^\\d{4}-\\d{2}-\\d{2}[Tt ]\\d{2}:\\d{2}"
    );

    private AmmsDateTimes() {}

    public static Instant now() {
        return Instant.now();
    }

    public static OffsetDateTime nowOdt() {
        return OffsetDateTime.now(ZONE);
    }

    public static OffsetDateTime toUtcOdt(Instant instant) {
        if (instant == null) {
            return null;
        }
        return instant.atOffset(ZONE);
    }

    public static Instant toInstant(OffsetDateTime odt) {
        if (odt == null) {
            return null;
        }
        return odt.toInstant();
    }

    /** Parse calendar date; rejects bare Instant / zoned midnight conversion. */
    public static LocalDate parseCalendarDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        if (ISO_DATE.matcher(trimmed).find()) {
            return LocalDate.parse(trimmed.substring(0, 10), CALENDAR_DATE);
        }
        throw new IllegalArgumentException("Expected calendar date YYYY-MM-DD, got: " + raw);
    }

    public static String formatCalendarDate(LocalDate date) {
        return date == null ? null : CALENDAR_DATE.format(date);
    }

    /**
     * Normalize a form/API value that should be a calendar date.
     * Keeps {@code YYYY-MM-DD}. If a datetime ISO sneaks in (e.g. {@code 2024-08-01T00:00:00.000Z}),
     * extracts the calendar date <em>from the string prefix</em> — never via local TZ conversion.
     */
    public static String normalizeCalendarDateValue(Object raw) {
        if (raw == null) {
            return null;
        }
        String s = String.valueOf(raw).trim();
        if (s.isEmpty() || "null".equalsIgnoreCase(s)) {
            return null;
        }
        if (ISO_DATE.matcher(s).find()) {
            return s.substring(0, 10);
        }
        throw new IllegalArgumentException("Invalid calendar date: " + raw);
    }

    /**
     * Walk a form payload and coerce fields whose schema type is {@code date}
     * (and any value that looks like an ISO date/datetime) to {@code YYYY-MM-DD}.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> normalizeFormPayloadDates(
            Map<String, Object> payload,
            List<Map<String, Object>> fieldDefs
    ) {
        if (payload == null || payload.isEmpty()) {
            return payload;
        }
        Map<String, Object> out = new LinkedHashMap<>(payload);
        if (fieldDefs != null) {
            for (Map<String, Object> field : fieldDefs) {
                Object name = field.get("name");
                Object type = field.get("type");
                if (name == null || !"date".equals(String.valueOf(type))) {
                    continue;
                }
                String key = String.valueOf(name);
                if (out.containsKey(key)) {
                    out.put(key, normalizeCalendarDateValue(out.get(key)));
                }
            }
        }
        // Defense in depth: any leftover ISO datetime-looking values under known date keys
        for (Map.Entry<String, Object> e : out.entrySet()) {
            Object v = e.getValue();
            if (!(v instanceof String s)) {
                continue;
            }
            if (ISO_INSTANT_PREFIX.matcher(s).find() && looksLikeDateFieldName(e.getKey())) {
                try {
                    e.setValue(normalizeCalendarDateValue(s));
                } catch (IllegalArgumentException ignored) {
                    // leave non-date strings alone
                }
            }
        }
        return out;
    }

    private static boolean looksLikeDateFieldName(String name) {
        if (name == null) {
            return false;
        }
        String n = name.toLowerCase();
        return n.contains("date")
                || n.contains("dob")
                || n.contains("birth")
                || n.endsWith("_on")
                || n.endsWith("day");
    }

    public static boolean isCalendarDateString(String raw) {
        if (raw == null || raw.isBlank()) {
            return false;
        }
        try {
            parseCalendarDate(raw);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public static Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw.trim());
        } catch (DateTimeParseException ex) {
            return OffsetDateTime.parse(raw.trim()).toInstant();
        }
    }
}
