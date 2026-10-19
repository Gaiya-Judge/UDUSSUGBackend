package com.udusug.voting.token.service;

import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.token.entity.VotingToken;
import com.udusug.voting.voter.repository.VoterRollRepository;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.service.ElectionStatusResolver;
import com.udusug.voting.blockchain.service.VotingContractService;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    private final ElectionRepository electionRepository;
    private final VotingContractService votingContractService;

    @Override
    @Transactional
    public OtpVerifyResponse issueToken(VoterRoll voter) {
        Election election = electionRepository.findFirstByOrderByIdDesc().orElse(null);
        if (!"ONGOING".equals(ElectionStatusResolver.resolve(election, OffsetDateTime.now(ZoneId.of("Africa/Lagos"))))) {
            throw new ApiException(HttpStatus.CONFLICT, "Voting is not open right now.");
        }
        if (voterRollRepository.claimBallot(voter.getId(), election.getSessionLabel()) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "A ballot has already been issued for this admission number in this session. If you were disconnected while voting, use 'Check my vote' on the same device, or contact the SUG ICT Team.");
        }
        LocalDateTime now = LocalDateTime.now();
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = "0x" + bytesToHex(randomBytes);
        String tokenHash = HashUtils.sha256(rawToken);
        LocalDateTime expiresAt = now.plusMinutes(SESSION_TIMEOUT_MINUTES);
        votingTokenRepository.save(VotingToken.builder().tokenHash(tokenHash).issuedAt(now).used(false).expiresAt(expiresAt).build());
        log.info("Voting token issued successfully");
        return OtpVerifyResponse.builder().votingToken(rawToken).expiresAt(expiresAt).build();
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
    @Transactional
    public void markUsed(VotingToken votingToken, String transactionHash) {
        votingToken.setUsed(true);
        votingToken.setTransactionHash(transactionHash);
        votingTokenRepository.save(votingToken);
        log.info("Voting token marked as used in local database");

    }

    @Override
    @Transactional
    public TokenStatusResponse getTokenStatus(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Voting token is required");
        String hash = HashUtils.sha256(rawToken.trim());
        VotingToken token = votingTokenRepository.findByTokenHash(hash).orElse(null);
        if (token == null) return new TokenStatusResponse("UNKNOWN", null, null);
        if (token.isUsed()) return new TokenStatusResponse("USED", token.getExpiresAt(), token.getTransactionHash());
        try {
            if (votingContractService.isTokenUsedOnChain(hash)) {
                token.setUsed(true);
                token.setTransactionHash(null);
                votingTokenRepository.save(token);
                return new TokenStatusResponse("USED", token.getExpiresAt(), null);
            }
        } catch (Exception ex) {
            log.warn("On-chain token status read failed; using local token state");
        }
        if (LocalDateTime.now().isAfter(token.getExpiresAt())) return new TokenStatusResponse("EXPIRED", token.getExpiresAt(), null);
        return new TokenStatusResponse("VALID", token.getExpiresAt(), null);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
