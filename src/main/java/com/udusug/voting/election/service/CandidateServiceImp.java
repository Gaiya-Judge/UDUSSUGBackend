package com.udusug.voting.election.service;

import com.udusug.voting.admin.dto.AdminCandidateResponse;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.UpdateCandidateRequest;
import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.entity.AuditLog;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.dto.CandidateResponse;
import com.udusug.voting.election.entity.Candidate;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.entity.Position;
import com.udusug.voting.election.repository.CandidateRepository;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.repository.PositionRepository;
import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateServiceImp implements CandidateService {

    private final CandidateRepository candidateRepository;
    private final PositionRepository positionRepository;
    private final ElectionRepository electionRepository;
    private final AdminRepository adminRepository;
    private final AuditLogRepository auditLogRepository;
    private final SessionGuard sessionGuard;
    private final VotingContractService votingContractService;

    @Override
    public List<CandidateResponse> getAllCandidates(Long positionId) {
        log.info("Fetching candidates for position filter: {}", positionId);

        Optional<Election> latestElectionOpt = electionRepository.findFirstByOrderByIdDesc();
        if (latestElectionOpt.isEmpty()) {
            log.info("No election found. Returning empty candidate list.");
            return Collections.emptyList();
        }

        String currentSessionLabel = latestElectionOpt.get().getSessionLabel();
        List<Candidate> candidates;

        if (positionId != null) {
            candidates = candidateRepository.findByPosition_IdAndPosition_SessionLabel(positionId, currentSessionLabel);
        } else {
            candidates = candidateRepository.findByPosition_SessionLabel(currentSessionLabel);
        }

        return candidates.stream()
                .map(this::mapToPublicResponse)
                .toList();
    }

    @Override
    public List<AdminCandidateResponse> getAllCandidatesForAdmin() {
        log.info("Admin request: fetching candidate list");
        return candidateRepository.findAll().stream()
                .map(this::mapToAdminResponse)
                .toList();
    }

    @Override
    @Transactional
    public AdminWriteResponse updateCandidate(String adminEmail, Long candidateId, UpdateCandidateRequest request) {
        log.info("Admin [{}] requesting update for candidateId={}", adminEmail, candidateId);

        // 1. Look up admin
        Admin admin = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Admin not found"));

        // 2. Look up candidate
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Candidate not found with id: " + candidateId));

        String newName = request.getName() != null ? request.getName() : candidate.getName();
        Long newPositionId = request.getPositionId() != null ? request.getPositionId() : candidate.getPosition().getId();
        String newDepartment = request.getDepartment() != null ? request.getDepartment() : candidate.getDepartment();

        log.info("Values passed information: " +
                "Candidate Name: [{}], Candidate poition number: [{}], Candidate department: [{}]",
                newName, newPositionId, newDepartment);


        // 3. Look up new position
        Position newPosition = positionRepository.findById(newPositionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Target position not found with id: " + request.getPositionId()));

        // 4. Pre-check session setup rules using candidate's CURRENT position sessionLabel
        sessionGuard.assertSessionAcceptsSetup(candidate.getPosition().getSessionLabel());

        // 5. Update on-chain first
        String txHash = votingContractService.updateCandidateOnChain(
                BigInteger.valueOf(candidate.getId()),
                BigInteger.valueOf(newPosition.getId()),
                newName
        );

        // 6. Only after on-chain success: update DB record (name, position, department)
        candidate.setName(newName);
        candidate.setPosition(newPosition);
        candidate.setDepartment(newDepartment);
        candidateRepository.save(candidate);

        // 7. Record audit log with txHash
        recordAudit(admin, "CANDIDATE_UPDATED",
                String.format("Updated candidate id=%d to name='%s', positionId=%d, department='%s'. TxHash: %s",
                        candidate.getId(), request.getName(), newPosition.getId(), request.getDepartment(), txHash));

        // 8. Return response containing transaction hash
        return AdminWriteResponse.builder()
                .message("Candidate updated successfully")
                .transactionHash(txHash)
                .build();
    }

    @Override
    @Transactional
    public AdminWriteResponse deleteCandidate(String adminEmail, Long candidateId) {
        log.info("Admin [{}] requesting soft-delete for candidateId={}", adminEmail, candidateId);

        // 1. Look up admin
        Admin admin = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Admin not found"));

        // 2. Look up candidate
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Candidate not found with id: " + candidateId));

        // 3. Pre-check session setup rules using candidate's position sessionLabel
        sessionGuard.assertSessionAcceptsSetup(candidate.getPosition().getSessionLabel());

        // 4. Execute on-chain remove Candidate
        String txHash = votingContractService.removeCandidateOnChain(BigInteger.valueOf(candidate.getId()));

        // 5. Only after on-chain success: soft delete in DB (set active = false)
        candidate.setActive(false);
        candidateRepository.save(candidate);

        // 6. Record audit log
        recordAudit(admin, "CANDIDATE_REMOVED",
                String.format("Soft-deleted candidate id=%d (active=false). TxHash: %s", candidate.getId(), txHash));

        // 7. Return response containing transaction hash
        return AdminWriteResponse.builder()
                .message("Candidate removed successfully")
                .transactionHash(txHash)
                .build();
    }

    private CandidateResponse mapToPublicResponse(Candidate candidate) {
        return CandidateResponse.builder()
                .candidateId(candidate.getId())
                .name(candidate.getName())
                .positionId(candidate.getPosition().getId())
                .department(candidate.getDepartment())
                .photoUrl(candidate.getPhotoUrl())
                .build();
    }

    private AdminCandidateResponse mapToAdminResponse(Candidate candidate) {
        return AdminCandidateResponse.builder()
                .id(candidate.getId())
                .name(candidate.getName())
                .positionId(candidate.getPosition().getId())
                .department(candidate.getDepartment())
                .photoUrl(candidate.getPhotoUrl())
                .active(candidate.isActive())
                .build();
    }

    private Admin findAdminByEmail(String email) {
        return adminRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Admin account not found for email: " + email));
    }

    private void recordAudit(Admin admin, String action, String details) {
        AuditLog auditLog = AuditLog.builder()
                .admin(admin)
                .action(action)
                .details(details)
                .build();
        auditLogRepository.save(auditLog);
    }
}
