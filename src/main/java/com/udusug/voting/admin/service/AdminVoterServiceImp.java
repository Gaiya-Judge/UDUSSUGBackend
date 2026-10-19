package com.udusug.voting.admin.service;

import com.udusug.voting.admin.dto.ResetBallotResponse;
import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.entity.AuditLog;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.service.ElectionStatusResolver;
import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.repository.VoterRollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminVoterServiceImp implements AdminVoterService {
    private final VoterRollRepository voterRollRepository;
    private final ElectionRepository electionRepository;
    private final AdminRepository adminRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public ResetBallotResponse resetBallot(String adminEmail, String admissionNumber) {
        String normalized = admissionNumber.trim().toUpperCase();
        VoterRoll voter = voterRollRepository.findByAdmissionNumber(normalized)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Voter not found"));
        Election election = electionRepository.findFirstByOrderByIdDesc().orElse(null);
        if (!"ONGOING".equals(ElectionStatusResolver.resolve(election, OffsetDateTime.now(ZoneId.of("Africa/Lagos")))))
            throw new ApiException(HttpStatus.CONFLICT, "Voting is not open right now.");
        if (!election.getSessionLabel().equals(voter.getBallotSession()))
            throw new ApiException(HttpStatus.CONFLICT, "No ballot has been issued to this voter for the current session.");
        voter.setBallotSession(null);
        voterRollRepository.save(voter);
        Admin admin = adminRepository.findByEmail(adminEmail).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Admin account not found"));
        recordAudit(admin, "RESET_BALLOT", normalized + " " + election.getSessionLabel());
        return new ResetBallotResponse("Ballot reset successfully");
    }

    private void recordAudit(Admin admin, String action, String details) {
        auditLogRepository.save(AuditLog.builder().admin(admin).action(action).details(details).build());
    }
}
