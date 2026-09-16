package com.udusug.voting.voter.service;

import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.VoterRoll;

public interface OtpService {

    /**
     * Generates a 6-digit numeric OTP, hashes it using SHA-256,
     * persists it with a 5-minute expiration timestamp linked to VoterRoll,
     * and returns the raw OTP code for immediate email delivery.
     */
    String generateAndSaveOtp(VoterRoll voter);

    /**
     * Verifies an OTP against the stored record for an admission number.
     * Marks the OTP verified on success and hands off directly to VotingToken issuance.
     */
    OtpVerifyResponse verifyOtp(String admissionNumber, String otpCode);
}
