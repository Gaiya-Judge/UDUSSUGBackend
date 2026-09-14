package com.udusug.voting.admin.controller;

import com.udusug.voting.admin.dto.AdminLoginRequest;
import com.udusug.voting.admin.dto.AdminLoginResponse;
import com.udusug.voting.admin.dto.ChangePasswordRequest;
import com.udusug.voting.admin.service.AdminAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<AdminLoginResponse> login(@Valid @RequestBody AdminLoginRequest request) {
        log.info("HTTP POST /api/admin/auth/login received for email: {}", request.getEmail());
        AdminLoginResponse response = adminAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        String adminEmail = authentication.getName();
        log.info("HTTP POST /api/admin/auth/change-password received for admin: {}", adminEmail);

        adminAuthService.changePassword(adminEmail, request);
        return ResponseEntity.ok("Password changed successfully");
    }
}
