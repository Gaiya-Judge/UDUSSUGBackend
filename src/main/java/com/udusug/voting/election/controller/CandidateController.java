package com.udusug.voting.election.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.admin.dto.AdminCandidateResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.admin.dto.SetElectionTimesRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.admin.dto.UpdateCandidateRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.dto.CandidateResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.election.service.CandidateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@Slf4j
@RestController
@Tag(name = "Candidates")
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
