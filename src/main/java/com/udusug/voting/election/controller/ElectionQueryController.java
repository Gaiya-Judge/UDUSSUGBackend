package com.udusug.voting.election.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.dto.ElectionResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.dto.PositionResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.service.ElectionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestParam;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@Tag(name = "Elections and Positions")
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
