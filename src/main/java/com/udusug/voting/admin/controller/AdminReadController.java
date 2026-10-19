package com.udusug.voting.admin.controller;

import com.udusug.voting.admin.dto.AdminDashboardResponse;
import com.udusug.voting.admin.service.AdminDashboardService;
import com.udusug.voting.election.dto.PositionResponse;
import com.udusug.voting.election.service.ElectionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@Slf4j
@RestController
@Tag(name = "Election Administration")
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminReadController {
    private final ElectionService electionService;
    private final AdminDashboardService adminDashboardService;

    @GetMapping("/positions")
    public ResponseEntity<List<PositionResponse>> getPositions(
            @RequestParam(required = false) String sessionLabel) {
        log.info("HTTP GET /api/admin/positions received for sessionLabel={}", sessionLabel);
        return ResponseEntity.ok(electionService.getAdminPositions(sessionLabel));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        log.info("HTTP GET /api/admin/dashboard received");
        return ResponseEntity.ok(adminDashboardService.getDashboard());
    }
}
