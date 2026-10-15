package com.hal.amms.platform.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtAuthFilterTest {

    private final JwtService jwtService = mock(JwtService.class);
    private final AmmsUserDetailsService userDetailsService = mock(AmmsUserDetailsService.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService, userDetailsService);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void inactiveAccountDoesNotAuthenticateFromAnExistingToken() throws Exception {
        UUID userId = UUID.randomUUID();
        Claims claims = claims(userId);
        when(jwtService.parse("token")).thenReturn(claims);
        when(userDetailsService.loadUserByUsername("operator"))
                .thenReturn(principal(userId, false));
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(any(), any());
    }

    @Test
    void enabledAccountAuthenticatesFromAnExistingToken() throws Exception {
        UUID userId = UUID.randomUUID();
        Claims claims = claims(userId);
        when(jwtService.parse("token")).thenReturn(claims);
        when(userDetailsService.loadUserByUsername("operator"))
                .thenReturn(principal(userId, true));
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        assertEquals("operator", SecurityContextHolder.getContext()
                .getAuthentication().getName());
        verify(chain).doFilter(any(), any());
    }

    @Test
    void missingAccountDoesNotAuthenticateFromAnExistingToken() throws Exception {
        UUID userId = UUID.randomUUID();
        Claims claims = claims(userId);
        when(jwtService.parse("token")).thenReturn(claims);
        when(userDetailsService.loadUserByUsername("operator"))
                .thenThrow(new UsernameNotFoundException("User not found"));
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(any(), any());
    }

    private Claims claims(UUID userId) {
        Claims claims = mock(Claims.class);
        when(claims.get("username", String.class)).thenReturn("operator");
        when(claims.getSubject()).thenReturn(userId.toString());
        return claims;
    }

    private UserPrincipal principal(UUID userId, boolean active) {
        return new UserPrincipal(userId, "operator", "hash", "Operator", List.of("PROGRESS"), active, false);
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        return request;
    }
}
