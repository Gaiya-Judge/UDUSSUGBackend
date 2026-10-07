package com.udusug.voting.election.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.dto.ResultsResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.dto.TurnoutResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.service.ResultsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PathVariable;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@Tag(name = "Results and Turnout")
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultController {

    private final ResultsService resultsService;

    @GetMapping("/results/{positionId}")
    public ResponseEntity<ResultsResponse> getResults(@PathVariable Long positionId) {
        log.info("HTTP GET /api/results/{} received", positionId);
        ResultsResponse response = resultsService.getResults(positionId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/turnout")
    public ResponseEntity<TurnoutResponse> getTurnout() {
        log.info("HTTP GET /api/turnout received");
        TurnoutResponse response = resultsService.getTurnout();
        return ResponseEntity.ok(response);
    }

}
