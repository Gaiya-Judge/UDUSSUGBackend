package com.udusug.voting.vote.service;

import com.udusug.voting.vote.dto.CastVoteRequest;
import com.udusug.voting.vote.dto.CastVoteResponse;

public interface VotingService {

    /**
     * Orchestrates token verification, on-chain ballot casting, local token consumption,
     * and graceful revert message translation.
     */
    CastVoteResponse castVote(CastVoteRequest request);
}
