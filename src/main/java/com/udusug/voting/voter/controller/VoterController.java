package com.udusug.voting.voter.controller;

import com.udusug.voting.voter.dto.VoterLoginRequest;
import com.udusug.voting.voter.dto.VoterLoginResponse;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.service.EmailService;
import com.udusug.voting.voter.service.OtpService;
import com.udusug.voting.voter.service.VoterAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/voter/auth")
@RequiredArgsConstructor
public class VoterController {

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
}
