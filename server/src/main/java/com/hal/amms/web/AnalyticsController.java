package com.hal.amms.web;

import com.hal.amms.security.UserPrincipal;
import com.hal.amms.service.AnalyticsService;
import com.hal.amms.web.dto.ApiDtos.RoleAnalyticsView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/me")
    public RoleAnalyticsView me(@AuthenticationPrincipal UserPrincipal user) {
        return analyticsService.forUser(user);
    }
}
