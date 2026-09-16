package com.udusug.voting.voter.service;

import com.udusug.voting.voter.dto.OtpVerifyResponse;
import com.udusug.voting.voter.entity.VoterRoll;

public interface VotingTokenService {

    /**
     * Issues a cryptographically secure, anonymous voting token.
     * Sets token lock on VoterRoll, stores ONLY SHA-256 hash in VotingToken table,
     * and returns the raw token payload for single-use transmission to frontend.
     */
    OtpVerifyResponse issueToken(VoterRoll voter);
}
