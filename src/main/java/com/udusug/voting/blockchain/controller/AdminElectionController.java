package com.udusug.voting.blockchain.controller;

import com.udusug.voting.admin.dto.AddCandidateRequest;
import com.udusug.voting.admin.dto.AddPositionRequest;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.SetElectionTimesRequest;
import com.udusug.voting.election.service.ElectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminElectionController {

    private final ElectionService electionService;

    @PostMapping("/positions")
    public ResponseEntity<AdminWriteResponse> addPosition(
            Authentication authentication,
            @Valid @RequestBody AddPositionRequest request
    ) {
        String adminEmail = authentication.getName();
        log.info("HTTP POST /api/admin/positions received from admin [{}], name: {}", adminEmail, request.getName());

        AdminWriteResponse response = electionService.addPosition(adminEmail, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/candidates")
    public ResponseEntity<AdminWriteResponse> addCandidate(
            Authentication authentication,
            @Valid @RequestBody AddCandidateRequest request
    ) {
        String adminEmail = authentication.getName();
        log.info("HTTP POST /api/admin/candidates received from admin [{}], candidateName: {}, positionId: {}",
                adminEmail, request.getName(), request.getPositionId());

        AdminWriteResponse response = electionService.addCandidate(adminEmail, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/election/schedule")
    public ResponseEntity<AdminWriteResponse> setElectionTimes(
            Authentication authentication,
            @Valid @RequestBody SetElectionTimesRequest request
    ) {
        String adminEmail = authentication.getName();
        log.info("HTTP POST /api/admin/election/schedule received from admin [{}], startTime: {}, endTime: {}",
                adminEmail, request.getStartTime(), request.getEndTime());

        AdminWriteResponse response = electionService.setElectionTimes(adminEmail, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/election/close")
    public ResponseEntity<AdminWriteResponse> closeElection(Authentication authentication) {
        String adminEmail = authentication.getName();
        log.info("HTTP POST /api/admin/election/close received from admin [{}]", adminEmail);

        AdminWriteResponse response = electionService.closeElection(adminEmail);
        return ResponseEntity.ok(response);
    }
}
