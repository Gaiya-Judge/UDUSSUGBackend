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
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.service.ElectionStatusResolver;
import com.udusug.voting.exception.ApiException;
import org.springframework.http.HttpStatus;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    private final ElectionRepository electionRepository;

    @PostMapping("/login")
    public ResponseEntity<VoterLoginResponse> login(@Valid @RequestBody VoterLoginRequest request) {
        log.info("HTTP POST /api/voter/auth/login received for admission number: {}", request.getAdmissionNumber());

        // 1. Validate admission number & active status
        VoterRoll voter = voterAuthService.checkAdmissionNumber(request.getAdmissionNumber());

        Election latest = electionRepository.findFirstByOrderByIdDesc().orElse(null);
        if (!"ONGOING".equals(ElectionStatusResolver.resolve(latest, OffsetDateTime.now(ZoneId.of("Africa/Lagos"))))) {
            throw new ApiException(HttpStatus.CONFLICT, "Voting is not open right now.");
        }

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
        log.info("HTTP POST /api/voter/auth/verify-otp received");

        OtpVerifyResponse response = otpService.verifyOtp(request.getAdmissionNumber(), request.getOtpCode());

        return ResponseEntity.ok(response);
    }
}
