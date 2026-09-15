package com.udusug.voting.voter.service;

import com.udusug.voting.voter.entity.OtpVerification;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.repository.OtpVerificationRepository;
import com.udusug.voting.voter.util.HashUtils;
import com.udusug.voting.voter.util.OtpGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpServiceImp implements OtpService {

    private final OtpVerificationRepository  otpVerificationRepository;

    // Default expiration duration: 5 minutes
    private static final long OTP_EXPIRATION_MINUTES = 5;

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
}
