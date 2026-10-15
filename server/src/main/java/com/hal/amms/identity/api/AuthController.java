package com.hal.amms.identity.api;

import com.hal.amms.identity.api.AuthDtos.*;
import com.hal.amms.identity.UserAdminRecord;
import com.hal.amms.identity.UserAdminService;
import com.hal.amms.platform.security.JwtService;
import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.platform.web.ApiException;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserAdminService userAdminService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                          UserAdminService userAdminService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userAdminService = userAdminService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        String token = jwtService.issue(principal.getId(), principal.getUsername(), principal.getRoles());
        return new LoginResponse(token, toUser(principal));
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return toUser(principal);
    }

    @PostMapping("/password")
    public UserResponse changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                       @Valid @RequestBody ChangePasswordRequest request) {
        if (principal == null) {
            throw ApiException.unauthorized("Not authenticated");
        }
        if (request == null || request.currentPassword() == null || request.newPassword() == null) {
            throw ApiException.badRequest("Current and new passwords are required");
        }
        UserAdminRecord user = userAdminService.changeOwnPassword(
                principal, request.currentPassword(), request.newPassword());
        return new UserResponse(user.id(), user.username(), user.displayName(), user.roles(), false);
    }

    private static UserResponse toUser(UserPrincipal p) {
        return new UserResponse(p.getId(), p.getUsername(), p.getDisplayName(), p.getRoles(),
                p.mustChangePassword());
    }
}
