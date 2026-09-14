package com.udusug.voting.config;

import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminDataSeeder implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.default-email}")
    private String defaultEmail;

    @Value("${app.admin.default-password}")
    private String defaultPassword;

    @Override
    public void run(String... args) throws Exception {

        log.info("Checking for existing Admin account in database...");

        if (adminRepository.count() == 0) {
            log.info("No Admin account found. Seeding initial admin account: {}", defaultEmail);

            Admin admin = Admin.builder()
                    .email(defaultEmail)
                    .passwordHash(passwordEncoder.encode(defaultPassword))
                    .failedLoginAttempts(0)
                    .lockedUntil(null)
                    .build();

            adminRepository.save(admin);
            log.info("Default Admin account created successfully!");
        } else {
            log.info("Admin account already exists. Skipping data seeding.");
        }
    }
}
