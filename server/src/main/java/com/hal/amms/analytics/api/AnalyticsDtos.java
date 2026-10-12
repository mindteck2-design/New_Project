package com.hal.amms.analytics.api;

import java.util.List;

public final class AnalyticsDtos {
    private AnalyticsDtos() {}

    public record RoleMetric(String key, String label, long value, String hint) {}

    public record RoleAnalyticsView(String primaryRole, List<String> roles, List<RoleMetric> metrics) {}
}
