package com.udusug.voting.admin.service;

import com.udusug.voting.admin.dto.AdminLoginRequest;
import com.udusug.voting.admin.dto.AdminLoginResponse;
import com.udusug.voting.admin.dto.ChangePasswordRequest;

public interface AdminAuthService {

    /**
     * Authenticates an admin using email/password, manages lockout state, and issues a JWT token.
     */
    AdminLoginResponse login(AdminLoginRequest request);

    /**
     * Updates an authenticated admin's password after validating their current password.
     */
    void changePassword(String adminEmail, ChangePasswordRequest request);
}
