package com.udusug.voting.admin.service;

import com.udusug.voting.admin.dto.AdminLoginRequest;
import com.udusug.voting.admin.dto.AdminLoginResponse;
import com.udusug.voting.admin.dto.ChangePasswordRequest;
import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.entity.AuditLog;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.config.security.JwtService;
import com.udusug.voting.exception.AccountLockedException;
import com.udusug.voting.exception.InvalidCredentialsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthServiceImpl implements AdminAuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_TIME_DURATION_MINUTES = 15;
    private static final long TOKEN_EXPIRATION_MS = 7_200_000L; // 2 hours

    private final AdminRepository adminRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    public AdminLoginResponse login(AdminLoginRequest request) {
        log.info("Processing login attempt for admin email: {}", request.getEmail());

        Admin admin = adminRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("Login failed: Admin not found for email [{}]", request.getEmail());
                    return new InvalidCredentialsException("Invalid email or password");
                });

        // 1. Lockout Check BEFORE password verification
        if (admin.getLockedUntil() != null) {
            if (admin.getLockedUntil().isAfter(LocalDateTime.now())) {
                log.warn("Login blocked: Account [{}] is locked until {}", admin.getEmail(), admin.getLockedUntil());
                throw new AccountLockedException("Account is locked due to consecutive failed attempts. Please try again after " + admin.getLockedUntil());
            } else {
                // Lockout cooldown expired, reset counters and save
                log.info("Account lockout period expired for admin [{}]. Resetting lockout state.", admin.getEmail());
                admin.setLockedUntil(null);
                admin.setFailedLoginAttempts(0);
                adminRepository.save(admin);
            }
        }

        // 2. Password Verification
        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            int newFailedAttempts = admin.getFailedLoginAttempts() + 1;
            admin.setFailedLoginAttempts(newFailedAttempts);

            if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
                admin.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_TIME_DURATION_MINUTES));
                adminRepository.save(admin);

                log.warn("Admin account locked after 5 failed attempts: {}", admin.getEmail());
                recordAudit(admin, "ACCOUNT_LOCKED", "Account locked for 15 minutes after 5 consecutive failed login attempts.");

                throw new AccountLockedException("Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.");
            } else {
                adminRepository.save(admin);
                log.warn("Login failed for admin [{}]: Invalid password (Attempt {}/{})", admin.getEmail(), newFailedAttempts, MAX_FAILED_ATTEMPTS);
                recordAudit(admin, "LOGIN_FAILED", "Failed login attempt (" + newFailedAttempts + "/" + MAX_FAILED_ATTEMPTS + ")");

                throw new InvalidCredentialsException("Invalid email or password");
            }
        }

        // 3. Login Success: Reset state & Issue Token
        admin.setFailedLoginAttempts(0);
        admin.setLockedUntil(null);
        adminRepository.save(admin);

        String jwt = jwtService.generateToken(admin.getEmail());
        log.info("Admin [{}] authenticated successfully. JWT issued.", admin.getEmail());
        recordAudit(admin, "LOGIN_SUCCESS", "Admin successfully authenticated.");

        return AdminLoginResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .expiresInMs(TOKEN_EXPIRATION_MS)
                .email(admin.getEmail())
                .build();
    }

    @Override
    public void changePassword(String adminEmail, ChangePasswordRequest request) {
        log.info("Processing password change request for admin email: {}", adminEmail);

        Admin admin = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> {
                    log.error("Password change failed: Admin not found for email [{}]", adminEmail);
                    return new InvalidCredentialsException("Admin account not found");
                });

        if (!passwordEncoder.matches(request.getCurrentPassword(), admin.getPasswordHash())) {
            log.warn("Password change failed for admin [{}]: Current password mismatch", adminEmail);
            recordAudit(admin, "PASSWORD_CHANGE_FAILED", "Failed attempt to change password due to current password mismatch.");
            throw new InvalidCredentialsException("Incorrect current password");
        }

        admin.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        adminRepository.save(admin);

        log.info("Password successfully updated for admin [{}]", adminEmail);
        recordAudit(admin, "PASSWORD_CHANGE_SUCCESS", "Admin successfully updated account password.");
    }

    private void recordAudit(Admin admin, String action, String details) {
        AuditLog auditLog = AuditLog.builder()
                .admin(admin)
                .action(action)
                .details(details)
                .build();
        auditLogRepository.save(auditLog);
    }
}
