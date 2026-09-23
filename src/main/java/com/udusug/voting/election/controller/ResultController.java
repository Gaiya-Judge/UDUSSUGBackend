package com.udusug.voting.election.controller;

import com.udusug.voting.election.dto.ResultsResponse;
import com.udusug.voting.election.dto.TurnoutResponse;
import com.udusug.voting.election.service.ResultsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
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
