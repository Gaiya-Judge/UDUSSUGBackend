package com.udusug.voting.election.service;

import com.udusug.voting.admin.dto.AddCandidateRequest;
import com.udusug.voting.admin.dto.AddPositionRequest;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.SetElectionTimesRequest;
import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.entity.AuditLog;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.entity.Candidate;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.entity.Position;
import com.udusug.voting.election.dto.PositionResponse;
import com.udusug.voting.election.dto.ElectionResponse;
import com.udusug.voting.election.repository.CandidateRepository;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.repository.PositionRepository;
import com.udusug.voting.election.util.SessionLabelUtil;
import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ElectionServiceImp implements ElectionService{

    private final VotingContractService votingContractService;
    private final PositionRepository positionRepository;
    private final CandidateRepository candidateRepository;
    private final ElectionRepository electionRepository;
    private final AdminRepository adminRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    public List<PositionResponse> getPositions(String sessionLabel) {
        List<Position> positions;
        if (sessionLabel != null) {
            positions = positionRepository.findBySessionLabelOrderByIdAsc(sessionLabel);
        } else {
            Election latest = electionRepository.findFirstByOrderByIdDesc().orElse(null);
            positions = latest == null
                    ? positionRepository.findAllByOrderByIdAsc()
                    : positionRepository.findBySessionLabelOrderByIdAsc(latest.getSessionLabel());
        }
        return positions.stream().map(p -> PositionResponse.builder()
                .id(p.getId()).name(p.getName()).sessionLabel(p.getSessionLabel()).build()).toList();
    }

    @Override
    public ElectionResponse getLatestElection() {
        Election latest = electionRepository.findFirstByOrderByIdDesc()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No election has been scheduled yet"));
        ZoneId lagos = ZoneId.of("Africa/Lagos");
        return ElectionResponse.builder()
                .sessionLabel(latest.getSessionLabel())
                .startTime(latest.getStartTime().atZoneSameInstant(lagos).toOffsetDateTime())
                .endTime(latest.getEndTime().atZoneSameInstant(lagos).toOffsetDateTime())
                .closed(latest.isClosed())
                .build();
    }

    @Override
    public AdminWriteResponse addPosition(String adminEmail, AddPositionRequest request) {
        log.info("Processing addPosition business logic for admin: {}, name: {}", adminEmail, request.getName());

        Admin admin = findAdminByEmail(adminEmail);
        String validatedLabel = SessionLabelUtil.validateAndNormalize(request.getSessionLabel());

        assertSessionAcceptsSetup(validatedLabel);

        // 1. Write on-chain (capturing read-before-write ID)
        VotingContractService.PositionWriteResult result = votingContractService.addPosition(request.getName());

        // 2. Cache locally with captured on-chain ID
        Position position = Position.builder()
                .id(result.assignedId())
                .name(request.getName())
                .sessionLabel(validatedLabel)
                .build();
        positionRepository.save(position);

        log.info("Successfully synced Position locally with ID: {}", result.assignedId());

        // 3. Write AuditLog
        recordAudit(admin, "ADD_POSITION",
                String.format("Added position '%s' with ID %d. TxHash: %s", request.getName(), result.assignedId(), result.transactionHash()));

        return AdminWriteResponse.builder()
                .message("Position created successfully")
                .id(result.assignedId())
                .transactionHash(result.transactionHash())
                .build();
    }


    @Override
    public AdminWriteResponse addCandidate(String adminEmail, AddCandidateRequest request) {

        log.info("Processing addCandidate business logic for admin: {}, positionId: {}, candidateName: {}",
                adminEmail, request.getPositionId(), request.getName());

        Admin admin = findAdminByEmail(adminEmail);

        // Validate local position exists
        Position position = positionRepository.findById(request.getPositionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Position not found with ID: " + request.getPositionId()));

        assertSessionAcceptsSetup(position.getSessionLabel());

        // 1. Write on-chain (capturing read-before-write ID)
        VotingContractService.CandidateWriteResult result = votingContractService.addCandidate(
                BigInteger.valueOf(request.getPositionId()),
                request.getName()
        );

        // 2. Cache locally (photoUrl left null per spec)
        Candidate candidate = Candidate.builder()
                .id(result.assignedId())
                .position(position)
                .name(request.getName())
                .active(true)
                .department(request.getDepartment())
                .photoUrl(null)
                .build();
        candidateRepository.save(candidate);

        log.info("Successfully synced Candidate locally with ID: {} under position ID: {}", result.assignedId(), request.getPositionId());

        // 3. Write AuditLog
        recordAudit(admin, "ADD_CANDIDATE",
                String.format("Added candidate '%s' (ID: %d) under position ID %d. TxHash: %s",
                        request.getName(), result.assignedId(), request.getPositionId(), result.transactionHash()));

        return AdminWriteResponse.builder()
                .message("Candidate created successfully")
                .id(result.assignedId())
                .transactionHash(result.transactionHash())
                .build();
    }

    @Override
    public AdminWriteResponse setElectionTimes(String adminEmail, SetElectionTimesRequest request) {

        log.info("Processing setElectionTimes business logic for admin: {}, start: {}, end: {}",
                adminEmail, request.getStartTime(), request.getEndTime());

        Admin admin = findAdminByEmail(adminEmail);
        String validatedLabel = SessionLabelUtil.validateAndNormalize(request.getSessionLabel());

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Election start time must be before end time");
        }

        Election existingElection = electionRepository.findFirstByOrderByIdDesc().orElse(null);

        if (existingElection != null) {
            String existingLabel = existingElection.getSessionLabel();
            int comparison = validatedLabel.compareTo(existingLabel);

            if (comparison < 0) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Cannot schedule an election for an earlier session than the current session " + existingLabel);
            } else if (comparison > 0) {
                // Check whether current active session has ended (either explicitly closed or time has passed)
                OffsetDateTime nowNigeria = OffsetDateTime.now(ZoneId.of("Africa/Lagos"));

                // Compare using OffsetDateTime converted to the same zone or epoch
                boolean timeEnded = existingElection.getEndTime().isBefore(nowNigeria);
                boolean ended = existingElection.isClosed() || timeEnded;

                if (!ended) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Session " + existingLabel + " is still active; a new session can only be scheduled after it ends");
                }
            } else {
                boolean ended = existingElection.isClosed()
                        || existingElection.getEndTime().isBefore(OffsetDateTime.now());
                if (ended) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Session " + existingLabel + " has already ended. Use a new session label to start a new election.");
                }
            }
        }

        // Convert LocalDateTime to epoch seconds
        BigInteger startEpoch = BigInteger.valueOf(request.getStartTime().toEpochSecond());
        BigInteger endEpoch = BigInteger.valueOf(request.getEndTime().toEpochSecond());

        log.info("""
        ELECTION TIME CONVERSION (Nigeria WAT +01:00)
        Local start time : {}
        Local end time   : {}
        Start epoch      : {}
        End epoch        : {}
        """,
                request.getStartTime(),
                request.getEndTime(),
                startEpoch,
                endEpoch);

        // 1. Write on-chain
        String txHash = votingContractService.setElectionTimes(startEpoch, endEpoch);

        // 2. Sync local Election cache
        Election election = existingElection;
        if (election == null) {
            election = new Election();
        }

        election.setSessionLabel(validatedLabel);
        election.setStartTime(request.getStartTime());
        election.setEndTime(request.getEndTime());
        election.setClosed(false);
        electionRepository.save(election);

        log.info("Successfully synced local Election times cache");

        // 3. Write AuditLog
        recordAudit(admin, "SET_ELECTION_TIMES",
                String.format("Set election schedule: Start=%s, End=%s. TxHash: %s",
                        request.getStartTime(), request.getEndTime(), txHash));

        return AdminWriteResponse.builder()
                .message("Election schedule set successfully")
                .transactionHash(txHash)
                .build();
    }

    @Override
    public AdminWriteResponse closeElection(String adminEmail) {
        log.info("Processing closeElection business logic for admin: {}", adminEmail);

        Admin admin = findAdminByEmail(adminEmail);

        // 1. Submit on-chain housekeeping transaction
        String txHash = votingContractService.closeElection();

        // 2. Sync local Election cache closed flag
        Election election = electionRepository.findFirstByOrderByIdDesc()
                .orElse(Election.builder().build());

        election.setClosed(true);
        electionRepository.save(election);

        log.info("Successfully updated local Election.closed flag cache to true");

        // 3. Write AuditLog entry
        recordAudit(admin, "CLOSE_ELECTION",
                String.format("Closed election on-chain and updated local cache flag. TxHash: %s", txHash));

        return AdminWriteResponse.builder()
                .message("Election closed successfully")
                .transactionHash(txHash)
                .build();
    }

    private void assertSessionAcceptsSetup(String targetLabel) {
        Election latestElection = electionRepository.findFirstByOrderByIdDesc().orElse(null);
        if (latestElection == null) {
            return;
        }

        String activeLabel = latestElection.getSessionLabel();
        int comparison = targetLabel.compareTo(activeLabel);

        if (comparison < 0) {
            throw new ApiException(HttpStatus.CONFLICT, "cannot modify a past session");
        }

        if (comparison == 0) {
            boolean ended = latestElection.isClosed() || latestElection.getEndTime().isBefore(OffsetDateTime.now());
            if (ended) {
                throw new ApiException(HttpStatus.CONFLICT, "session has ended");
            }
        }
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
