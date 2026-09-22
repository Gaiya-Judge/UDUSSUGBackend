package com.udusug.voting.token.service;

import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.token.entity.VotingToken;
import com.udusug.voting.voter.repository.VoterRollRepository;
import com.udusug.voting.token.repository.VotingTokenRepository;
import com.udusug.voting.voter.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional
    public OtpVerifyResponse issueToken(VoterRoll voter) {

        LocalDateTime now = LocalDateTime.now();

        // Check active lock status
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

    @Override
    @Transactional(readOnly = true)
    public VotingToken verifyToken(String rawToken) {

        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voting token is required");
        }

        String inputHash = HashUtils.sha256(rawToken.trim());
        log.info("Pre-checking voting token (Hash prefix: {})", inputHash.substring(0, 10));

        VotingToken token = votingTokenRepository.findByTokenHash(inputHash)
                .orElseThrow(() -> {
                    log.warn("Token verification failed: Hash prefix [{}] not found", inputHash.substring(0, 10));
                    return new ApiException(HttpStatus.UNAUTHORIZED, "Invalid voting token");
                });

        if (token.isUsed()) {
            log.warn("Token verification failed: Token (Hash prefix: {}) has already been used", inputHash.substring(0, 10));
            throw new ApiException(HttpStatus.CONFLICT, "Voting token has already been used");
        }

        if (LocalDateTime.now().isAfter(token.getExpiresAt())) {
            log.warn("Token verification failed: Token (Hash prefix: {}) expired at {}", inputHash.substring(0, 10), token.getExpiresAt());
            throw new ApiException(HttpStatus.GONE, "Voting token has expired. Please authenticate again");
        }

        log.info("Voting token local pre-check passed (Hash prefix: {})", inputHash.substring(0, 10));
        return token;
    }

    @Override
    @Transactional(readOnly = true)
    public void markUsed(VotingToken votingToken) {
        votingToken.setUsed(true);
        votingTokenRepository.save(votingToken);
        log.info("Voting token marked as used in local database (Hash prefix: {})", votingToken.getTokenHash().substring(0, 10));

    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
