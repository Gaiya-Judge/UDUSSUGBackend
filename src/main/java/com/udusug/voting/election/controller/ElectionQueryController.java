package com.udusug.voting.election.controller;

import com.udusug.voting.election.dto.ElectionResponse;
import com.udusug.voting.election.dto.PositionResponse;
import com.udusug.voting.election.service.ElectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ElectionQueryController {
    private final ElectionService electionService;

    @GetMapping("/positions")
    public ResponseEntity<List<PositionResponse>> getPositions(
            @RequestParam(required = false) String sessionLabel) {
        return ResponseEntity.ok(electionService.getPositions(sessionLabel));
    }

    @GetMapping("/election")
    public ResponseEntity<ElectionResponse> getElection() {
        return ResponseEntity.ok(electionService.getLatestElection());
    }
}
