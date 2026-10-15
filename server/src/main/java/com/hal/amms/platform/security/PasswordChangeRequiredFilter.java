package com.hal.amms.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final String CURRENT_USER_PATH = "/api/v1/auth/me";
    private static final String CHANGE_PASSWORD_PATH = "/api/v1/auth/password";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal
                && principal.mustChangePassword() && !isAllowedRequest(request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("""
                    {"code":"PASSWORD_CHANGE_REQUIRED","message":"Change your temporary password before continuing","details":null}
                    """.trim());
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isAllowedRequest(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return (HttpMethod.GET.matches(request.getMethod()) && CURRENT_USER_PATH.equals(path))
                || (HttpMethod.POST.matches(request.getMethod()) && CHANGE_PASSWORD_PATH.equals(path));
    }
}
