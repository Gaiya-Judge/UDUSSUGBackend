package com.udusug.voting.election.controller;

import com.udusug.voting.election.dto.ElectionResponse;
import com.udusug.voting.election.dto.PositionResponse;
import com.udusug.voting.election.service.ElectionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@Slf4j
@RestController
@Tag(name = "Elections and Positions")
@RequestMapping("/api")
@RequiredArgsConstructor
public class ElectionQueryController {
    private final ElectionService electionService;

    @GetMapping("/positions")
    public ResponseEntity<List<PositionResponse>> getPositions() {
        log.info("HTTP GET /api/positions received");
        return ResponseEntity.ok(electionService.getPositions());
    }

    @GetMapping("/election")
    public ResponseEntity<ElectionResponse> getElection() {
        log.info("HTTP GET /api/election received");
        return ResponseEntity.ok(electionService.getLatestElection());
    }
}
