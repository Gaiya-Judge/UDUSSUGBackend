package com.udusug.voting.vote.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.vote.dto.CastVoteRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.vote.dto.CastVoteResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.vote.service.VotingService;
import com.udusug.voting.token.service.VotingTokenService;
import com.udusug.voting.token.service.TokenStatusResponse;
import com.udusug.voting.vote.dto.TokenStatusRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@Tag(name = "Voting")
@RequestMapping("/api")
@RequiredArgsConstructor
public class VotingController {

    private final VotingService votingService;
    private final VotingTokenService votingTokenService;

    @PostMapping("/vote")
    public ResponseEntity<CastVoteResponse> castVote(@Valid @RequestBody CastVoteRequest request) {
        log.info("HTTP POST /api/vote request received");

        CastVoteResponse response = votingService.castVote(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/vote/token-status")
    public ResponseEntity<TokenStatusResponse> tokenStatus(@Valid @RequestBody TokenStatusRequest request) {
        log.info("HTTP POST /api/vote/token-status request received");
        return ResponseEntity.ok(votingTokenService.getTokenStatus(request.token()));
    }

}
