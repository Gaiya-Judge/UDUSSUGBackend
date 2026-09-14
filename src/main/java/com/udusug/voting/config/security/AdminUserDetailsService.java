package com.udusug.voting.config.security;

import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminRepository adminRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.info("Loading UserDetails for admin email: {}", email);
        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Admin lookup failed for email: {}", email);
                    return new UsernameNotFoundException("Admin not found with email: " + email);
                });

        return User.builder()
                .username(admin.getEmail())
                .password(admin.getPasswordHash())
                .roles("ADMIN")
                .build();
    }
}
