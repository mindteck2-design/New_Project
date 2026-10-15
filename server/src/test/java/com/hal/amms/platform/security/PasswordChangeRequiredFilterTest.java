package com.hal.amms.platform.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class PasswordChangeRequiredFilterTest {

    private final PasswordChangeRequiredFilter filter = new PasswordChangeRequiredFilter();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void temporaryPasswordBlocksOtherAuthenticatedApiRequests() throws Exception {
        setPrincipal(true);
        MockHttpServletRequest request = request("GET", "/api/v1/users");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("PASSWORD_CHANGE_REQUIRED"));
        verifyNoInteractions(chain);
    }

    @Test
    void temporaryPasswordAllowsIdentityReadAndPasswordChange() throws Exception {
        setPrincipal(true);
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request("POST", "/api/v1/auth/password"),
                new MockHttpServletResponse(), chain);

        verify(chain).doFilter(any(), any());
    }

    private void setPrincipal(boolean mustChangePassword) {
        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "operator", "hash", "Operator",
                List.of("PROGRESS"), true, mustChangePassword);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private MockHttpServletRequest request(String method, String path) {
        return new MockHttpServletRequest(method, path);
    }
}
