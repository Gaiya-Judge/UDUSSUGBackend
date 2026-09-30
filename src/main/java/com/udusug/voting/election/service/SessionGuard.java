package com.udusug.voting.election.service;

import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionGuard {

    private final ElectionRepository electionRepository;

    /**
     * Validates that setup actions (adding/updating positions/candidates) are permitted
     * for the given session label.
     * Rejects if the session has ended OR if the current time is on/after electionStart.
     */
    public void assertSessionAcceptsSetup(String targetLabel) {
        Election election = electionRepository.findBySessionLabel(targetLabel)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Election session not found for label: " + targetLabel));

        OffsetDateTime now = OffsetDateTime.now();

        // 1. Check if session has ended
        if (election.getEndTime() != null && now.isAfter(election.getEndTime())) {
            log.warn("Setup operation rejected: Election session [{}] has already ended", targetLabel);
            throw new ApiException(HttpStatus.CONFLICT, "Election session has already ended");
        }

        // 2. Check if election has started (contract enforces beforeElectionStarts on setup methods)
        if (election.getStartTime() != null && !now.isBefore(election.getStartTime())) {
            log.warn("Setup operation rejected: Election session [{}] has already started or is starting now", targetLabel);
            throw new ApiException(HttpStatus.CONFLICT, "Election setup changes are frozen because the election has started");
        }
    }
}
