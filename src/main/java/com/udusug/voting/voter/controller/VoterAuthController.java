package com.udusug.voting.voter.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.dto.OtpVerifyRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.dto.OtpVerifyResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.dto.VoterLoginRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.dto.VoterLoginResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.entity.VoterRoll;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.service.EmailService;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.service.OtpService;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.voter.service.VoterAuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@Tag(name = "Voter Authentication")
@RequestMapping("/api/voter/auth")
@RequiredArgsConstructor
public class VoterAuthController {

    private final VoterAuthService voterAuthService;
    private final OtpService otpService;
    private final EmailService emailService;

    @PostMapping("/login")
    public ResponseEntity<VoterLoginResponse> login(@Valid @RequestBody VoterLoginRequest request) {
        log.info("HTTP POST /api/voter/auth/login received for admission number: {}", request.getAdmissionNumber());

        // 1. Validate admission number & active status
        VoterRoll voter = voterAuthService.checkAdmissionNumber(request.getAdmissionNumber());

        // 2. Generate 6-digit numeric OTP & persist SHA-256 hash (5 min expiry)
        String rawOtp = otpService.generateAndSaveOtp(voter);

        // 3. Send plain OTP code to voter's registered email
        emailService.sendOtpEmail(voter.getEmail(), rawOtp);

        // 4. Return generic success message (no token issued yet)
        VoterLoginResponse response = VoterLoginResponse.builder()
                .message("If the admission number is valid and active, an OTP has been dispatched to the registered email address.")
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<OtpVerifyResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        log.info("HTTP POST /api/voter/auth/verify-otp received for admission number: {}", request.getAdmissionNumber());

        OtpVerifyResponse response = otpService.verifyOtp(request.getAdmissionNumber(), request.getOtpCode());

        return ResponseEntity.ok(response);
    }
}
