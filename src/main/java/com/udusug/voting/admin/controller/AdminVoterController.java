package com.udusug.voting.admin.controller;

import com.udusug.voting.admin.dto.ResetBallotRequest;
import com.udusug.voting.admin.dto.ResetBallotResponse;
import com.udusug.voting.admin.service.AdminVoterService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@Tag(name = "Voter Administration")
@RequestMapping("/api/admin/voters")
@RequiredArgsConstructor
public class AdminVoterController {
    private final AdminVoterService adminVoterService;

    @PostMapping("/reset-ballot")
    public ResponseEntity<ResetBallotResponse> resetBallot(Authentication authentication,
            @Valid @RequestBody ResetBallotRequest request) {
        log.info("HTTP POST /api/admin/voters/reset-ballot received");
        return ResponseEntity.ok(adminVoterService.resetBallot(authentication.getName(), request.admissionNumber()));
    }
}
