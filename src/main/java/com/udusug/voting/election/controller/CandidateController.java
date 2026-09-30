package com.udusug.voting.election.controller;

import com.udusug.voting.admin.dto.AdminCandidateResponse;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.SetElectionTimesRequest;
import com.udusug.voting.admin.dto.UpdateCandidateRequest;
import com.udusug.voting.election.dto.CandidateResponse;
import com.udusug.voting.election.service.CandidateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping
    public ResponseEntity<List<CandidateResponse>> getCandidates(@RequestParam(required = false) Long positionId) {

        log.info("HTTP GET /api/candidates request received (public endpoint)");

        List<CandidateResponse> response = candidateService.getAllCandidates(positionId);
        return ResponseEntity.ok(response);
    }
}
