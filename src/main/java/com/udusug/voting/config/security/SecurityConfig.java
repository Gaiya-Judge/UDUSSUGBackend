package com.udusug.voting.config.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.util.Arrays;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final Environment environment;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("Initializing SecurityFilterChain configuration");

        boolean swaggerEnabled = Arrays.asList(environment.getActiveProfiles()).contains("dev")
                && !Arrays.asList(environment.getActiveProfiles()).contains("prod");

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**")
                        .access((authentication, context) -> new org.springframework.security.authorization.AuthorizationDecision(swaggerEnabled))
                        .requestMatchers(HttpMethod.GET,
                                "/", "/index.html", "/about.html", "/faq.html", "/login.html", "/verify.html", "/ballot.html",
                                "/receipt.html", "/results.html", "/candidates.html", "/admin-login.html", "/admin-dashboard.html", "/election-settings.html",
                                "/admin/**", "/css/**", "/js/**", "/images/**", "/favicon.ico")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/positions", "/api/election").permitAll()
                        // Open admin login endpoint
                        .requestMatchers("/api/admin/auth/login").permitAll()

                        // Secure all other admin endpoints
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Explicitly permit voter-facing endpoints (deliberately outside Spring Security auth model)
                        .requestMatchers(
                                "/api/voter/**",
                                "/api/vote",
                                "/api/vote/token-status",
                                "/api/candidates",
                                "/api/results/**",
                                "/api/turnout"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
