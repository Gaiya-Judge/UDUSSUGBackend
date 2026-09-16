package com.udusug.voting.voter.service;

import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.entity.VotingToken;
import com.udusug.voting.voter.repository.VoterRollRepository;
import com.udusug.voting.voter.repository.VotingTokenRepository;
import com.udusug.voting.voter.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class VotingTokenServiceImp implements  VotingTokenService {

    private static final long SESSION_TIMEOUT_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final VotingTokenRepository votingTokenRepository;
    private final VoterRollRepository voterRollRepository;

    @Override
    public OtpVerifyResponse issueToken(VoterRoll voter) {

        LocalDateTime now = LocalDateTime.now();

        // Check active lock status (FR7)
        if (voter.isTokenLockActive()) {
            if (voter.getTokenIssuedAt() != null && voter.getTokenIssuedAt().plusMinutes(SESSION_TIMEOUT_MINUTES).isAfter(now)) {
                log.warn("Token issuance rejected: Admission number [{}] already has an active session lock", voter.getAdmissionNumber());
                throw new ApiException(HttpStatus.CONFLICT, "An active voting token has already been issued for this admission number");
            }
            // Lock active but window has expired -> release lock so new token can be generated
            log.info("Expired token lock released for admission number [{}]", voter.getAdmissionNumber());
        }

        // 1. Update VoterRoll lock BEFORE boundary (no token raw or hash stored here!)
        voter.setTokenLockActive(true);
        voter.setTokenIssuedAt(now);
        voterRollRepository.save(voter);
        log.info("VoterRoll token lock initialized for admission number [{}]", voter.getAdmissionNumber());

        // ======================== ANONYMITY BOUNDARY ========================

        // 2. Generate 32-byte cryptographically secure random value (NFR11)
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = "0x" + bytesToHex(randomBytes);

        // 3. Hash raw token and store ONLY the hash in database
        String tokenHash = HashUtils.sha256(rawToken);
        LocalDateTime expiresAt = now.plusMinutes(SESSION_TIMEOUT_MINUTES);

        VotingToken votingToken = VotingToken.builder()
                .tokenHash(tokenHash)
                .issuedAt(now)
                .used(false)
                .expiresAt(expiresAt)
                .build();

        votingTokenRepository.save(votingToken);

        // Logging compliance: Log token event referencing ONLY a short hash prefix (NO voter ID)
        log.info("Voting token issued successfully (Hash prefix: {})", tokenHash.substring(0, 10));

        // 4. Return raw token payload strictly for transmission to frontend
        return OtpVerifyResponse.builder()
                .votingToken(rawToken)
                .expiresAt(expiresAt)
                .build();
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
