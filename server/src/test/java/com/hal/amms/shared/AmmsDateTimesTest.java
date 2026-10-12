package com.hal.amms.shared;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AmmsDateTimesTest {

    @Test
    void calendarDateSurvivesIsoDatetimeWithZWithoutOffByOne() {
        // Classic bug: treating DOB as Instant midnight UTC then formatting in local TZ.
        assertEquals("2024-08-01", AmmsDateTimes.normalizeCalendarDateValue("2024-08-01"));
        assertEquals("2024-08-01", AmmsDateTimes.normalizeCalendarDateValue("2024-08-01T00:00:00.000Z"));
        assertEquals("2024-08-01", AmmsDateTimes.normalizeCalendarDateValue("2024-08-01T18:30:00+05:30"));
        assertEquals("2024-08-01", AmmsDateTimes.formatCalendarDate(AmmsDateTimes.parseCalendarDate("2024-08-01")));
    }

    @Test
    void formPayloadNormalizesDobFieldNames() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("dob", "2024-08-01T00:00:00.000Z");
        payload.put("dateOfBirth", "2024-08-01T00:00:00+05:30");
        payload.put("notes", "keep me");

        Map<String, Object> normalized = AmmsDateTimes.normalizeFormPayloadDates(payload, null);
        assertEquals("2024-08-01", normalized.get("dob"));
        assertEquals("2024-08-01", normalized.get("dateOfBirth"));
        assertEquals("keep me", normalized.get("notes"));
    }

    @Test
    void formPayloadNormalizesTypedDateFieldsFromSchema() {
        Map<String, Object> payload = Map.of("hireDate", "2024-08-01T00:00:00.000Z");
        List<Map<String, Object>> fields = List.of(Map.of("name", "hireDate", "type", "date"));
        Map<String, Object> normalized = AmmsDateTimes.normalizeFormPayloadDates(new LinkedHashMap<>(payload), fields);
        assertEquals("2024-08-01", normalized.get("hireDate"));
    }
}
