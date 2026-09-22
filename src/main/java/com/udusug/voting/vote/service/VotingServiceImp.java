package com.udusug.voting.vote.service;

import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.exception.ApiException;
import com.udusug.voting.vote.dto.CastVoteRequest;
import com.udusug.voting.vote.dto.CastVoteResponse;
import com.udusug.voting.token.entity.VotingToken;
import com.udusug.voting.token.service.VotingTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class VotingServiceImp implements VotingService{

    private final VotingTokenService votingTokenService;
    private final VotingContractService votingContractService;

    @Override
    public CastVoteResponse castVote(CastVoteRequest request) {

        log.info("Received vote casting request");

        // 1. Fail-fast local pre-check (token existence, not used, not expired)
        VotingToken token = votingTokenService.verifyToken(request.getToken());

        // Array length parity check
        if (request.getPositionIds().size() != request.getCandidateIds().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Position selections and candidate selections must have matching lengths");
        }

        String transactionHash;

        // 2. Execute on-chain transaction & catch revert exceptions
        try {
            transactionHash = votingContractService.castVote(
                    token.getTokenHash(),
                    request.getPositionIds(),
                    request.getCandidateIds()
            );
        } catch (Exception e) {
            log.error("On-chain transaction execution failed for token (Hash prefix: {}): ",
                    token.getTokenHash().substring(0, 10), e);

            String rawError = e.getMessage() != null ? e.getMessage() : "";

            // Map common smart contract revert reasons to plain-language ApiException responses (NFR15)
            if (rawError.contains("Token already used")) {
                throw new ApiException(HttpStatus.CONFLICT, "Voting token has already been used on-chain");
            } else if (rawError.contains("Election not active")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Voting is not currently active. Check election schedule");
            } else if (rawError.contains("Duplicate position")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Ballot contains duplicate selections for the same position");
            } else if (rawError.contains("Candidate does not belong to position")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected candidate does not belong to the specified position");
            } else if (rawError.contains("Invalid token")) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid voting token submission");
            } else {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Vote submission reverted on-chain: " + (rawError.isBlank() ? "Transaction execution failed" : rawError)
                );
            }
        }

        // 3. Mark local VotingToken as used upon successful transaction mining
        votingTokenService.markUsed(token);

        log.info("Vote cast successfully for token (Hash prefix: {}). Transaction Hash: {}",
                token.getTokenHash().substring(0, 10), transactionHash);

        return CastVoteResponse.builder()
                .transactionHash(transactionHash)
                .message("Vote successfully cast and recorded on the blockchain")
                .build();
    }
}
