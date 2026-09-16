package com.udusug.voting.voter.service;

import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.OtpVerification;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.repository.OtpVerificationRepository;
import com.udusug.voting.voter.repository.VoterRollRepository;
import com.udusug.voting.voter.util.HashUtils;
import com.udusug.voting.voter.util.OtpGenerator;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpServiceImp implements OtpService {

    private final OtpVerificationRepository  otpVerificationRepository;
    private final VoterRollRepository voterRollRepository;
    private final VotingTokenService votingTokenService;

    // Default expiration duration: 5 minutes
    private static final long OTP_EXPIRATION_MINUTES = 5;
    private static final String GENERIC_REJECTION = "Invalid admission number or OTP code";

    @Override
    public String generateAndSaveOtp(VoterRoll voter) {

        log.info("Generating OTP for voter admission number: {}", voter.getAdmissionNumber());

        // 1. Produce 6-digit numeric OTP
        String rawOtp = OtpGenerator.generate6DigitOtp();

        // 2. Compute SHA-256 hash (raw code is NEVER stored in the database)
        String otpHash = HashUtils.sha256(rawOtp);

        // 3. Set expiration timestamp (5 minutes default)
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_EXPIRATION_MINUTES);

        // 4. Save to OtpVerification with FK reference to VoterRoll
        OtpVerification verification = OtpVerification.builder()
                .voterRoll(voter)
                .otpCodeHash(otpHash)
                .expiresAt(expiresAt)
                .verified(false)
                .build();

        otpVerificationRepository.save(verification);
        log.info("Successfully persisted hashed OTP for admission number: {} (expires in {} minutes)",
                voter.getAdmissionNumber(), OTP_EXPIRATION_MINUTES);

        // Return raw OTP strictly for email delivery handling
        return rawOtp;
    }

    @Override
    @Transactional
    public OtpVerifyResponse verifyOtp(String admissionNumber, String otpCode) {

        String trimmedAdmission = admissionNumber.trim().toUpperCase();
        log.info("Processing OTP verification request for admission number: {}", trimmedAdmission);

        VoterRoll voter = voterRollRepository.findByAdmissionNumber(trimmedAdmission)
                .orElseThrow(() -> {
                    log.warn("OTP verification failed: Admission number [{}] not found", trimmedAdmission);
                    return new ApiException(HttpStatus.UNAUTHORIZED, GENERIC_REJECTION);
                });

        OtpVerification otpRecord = otpVerificationRepository
                .findTopByVoterRollAndVerifiedFalseOrderByExpiresAtDesc(voter)
                .orElseThrow(() -> {
                    log.warn("OTP verification failed: No active/unverified OTP record found for admission number [{}]", trimmedAdmission);
                    return new ApiException(HttpStatus.UNAUTHORIZED, GENERIC_REJECTION);
                });

        if (otpRecord.isVerified()) {
            log.warn("OTP verification failed: OTP code already used/verified for admission number [{}]", trimmedAdmission);
            throw new ApiException(HttpStatus.CONFLICT, "OTP code has already been used");
        }

        if (LocalDateTime.now().isAfter(otpRecord.getExpiresAt())) {
            log.warn("OTP verification failed: OTP expired for admission number [{}] at {}", trimmedAdmission, otpRecord.getExpiresAt());
            throw new ApiException(HttpStatus.GONE, "OTP code has expired. Please request a new one");
        }

        String inputHash = HashUtils.sha256(otpCode.trim());
        if (!otpRecord.getOtpCodeHash().equals(inputHash)) {
            log.warn("OTP verification failed: Invalid OTP code provided for admission number [{}]", trimmedAdmission);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
        }

        // Mark single-use OTP as verified so it cannot be reused
        otpRecord.setVerified(true);
        otpVerificationRepository.save(otpRecord);
        log.info("OTP successfully verified for admission number [{}]", trimmedAdmission);

        // Hand off directly to token issuance & lock initialization
        return votingTokenService.issueToken(voter);
    }
}
