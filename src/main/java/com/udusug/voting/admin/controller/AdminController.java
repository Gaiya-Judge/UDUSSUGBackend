package com.udusug.voting.admin.controller;

import com.udusug.voting.admin.dto.AdminCandidateResponse;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.UpdateCandidateRequest;
import com.udusug.voting.election.service.CandidateService;
import com.udusug.voting.election.service.ElectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/candidates")
@RequiredArgsConstructor
public class AdminController {

    private final CandidateService candidateService;

    @GetMapping
    public ResponseEntity<List<AdminCandidateResponse>> getAllCandidateForAdmin() {
        log.info("HTTP GET /admin/candidates request received (public endpoint)");

        List<AdminCandidateResponse> response = candidateService.getAllCandidatesForAdmin();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminWriteResponse> updateCandidate(Authentication authentication,
                                                              @PathVariable("id") Long candidateId,
                                                              @Valid @RequestBody UpdateCandidateRequest request) {
        String adminEmail = authentication.getName();
        log.info("HTTP PUT /api/admin/candidates/{} received from admin [{}]", candidateId, adminEmail);

        AdminWriteResponse response = candidateService.updateCandidate(adminEmail, candidateId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<AdminWriteResponse> deleteCandidate(Authentication authentication,
                                                              @PathVariable("id") Long candidateId) {
        String adminEmail = authentication.getName();
        log.info("HTTP DELETE /api/admin/candidates/{} received from admin [{}]", candidateId, adminEmail);

        AdminWriteResponse response = candidateService.deleteCandidate(adminEmail, candidateId);
        return ResponseEntity.ok(response);
    }

}
