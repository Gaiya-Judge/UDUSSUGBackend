package com.udusug.voting.token.service;

import com.udusug.voting.token.entity.VotingToken;
import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.VoterRoll;

public interface VotingTokenService {

    /**
     * Issues a cryptographically secure, anonymous voting token.
     * Sets token lock on VoterRoll, stores ONLY SHA-256 hash in VotingToken table,
     * and returns the raw token payload for single-use transmission to frontend.
     */
    OtpVerifyResponse issueToken(VoterRoll voter);

    /**
     * Verifies an incoming raw voting token against stored SHA-256 hashes.
     * Performs fail-fast checks: existence, usage status, and 15-minute expiration.
     */
    VotingToken verifyToken(String rawToken);

    /**
     * Marks a verified voting token as used after successful vote submission on-chain.
     */
    void markUsed(VotingToken votingToken);
}
