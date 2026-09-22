package com.udusug.voting.vote.controller;

import com.udusug.voting.vote.dto.CastVoteRequest;
import com.udusug.voting.vote.dto.CastVoteResponse;
import com.udusug.voting.vote.service.VotingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VotingController {

    private final VotingService votingService;

    @PostMapping("/vote")
    public ResponseEntity<CastVoteResponse> castVote(@Valid @RequestBody CastVoteRequest request) {
        log.info("HTTP POST /api/vote request received");

        CastVoteResponse response = votingService.castVote(request);
        return ResponseEntity.ok(response);
    }
}
