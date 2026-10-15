package com.hal.amms.identity.api;

import com.hal.amms.identity.UserAdminRecord;
import com.hal.amms.identity.UserAdminService;
import com.hal.amms.identity.api.UserAdminDtos.*;
import com.hal.amms.platform.security.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    public UserPageResponse list(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "25") int size,
                                 @RequestParam(required = false) Boolean active,
                                 @RequestParam(required = false) String role,
                                 @RequestParam(required = false) String q) {
        UserAdminService.UserPage result = userAdminService.list(page, size, active, role, q);
        return new UserPageResponse(result.items().stream().map(UserAdminController::toResponse).toList(),
                result.page(), result.size(), result.total());
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable UUID id) {
        return toResponse(userAdminService.get(id));
    }

    @PostMapping
    public UserResponse create(@AuthenticationPrincipal UserPrincipal actor,
                               @Valid @RequestBody CreateUserRequest request) {
        return toResponse(userAdminService.create(actor, request.username(), request.displayName(),
                request.roles(), request.temporaryPassword()));
    }

    @PatchMapping("/{id}")
    public UserResponse update(@AuthenticationPrincipal UserPrincipal actor, @PathVariable UUID id,
                               @Valid @RequestBody UpdateUserRequest request) {
        return toResponse(userAdminService.update(actor, id, request.displayName(), request.roles(),
                request.active()));
    }

    @PostMapping("/{id}/password-reset")
    public UserResponse resetPassword(@AuthenticationPrincipal UserPrincipal actor, @PathVariable UUID id,
                                      @Valid @RequestBody ResetPasswordRequest request) {
        return toResponse(userAdminService.resetPassword(actor, id, request.temporaryPassword()));
    }

    private static UserResponse toResponse(UserAdminRecord user) {
        return new UserResponse(user.id(), user.username(), user.displayName(), user.active(),
                user.mustChangePassword(), List.copyOf(user.roles()));
    }
}
