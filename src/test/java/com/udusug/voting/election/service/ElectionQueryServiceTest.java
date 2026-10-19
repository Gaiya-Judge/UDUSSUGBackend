package com.udusug.voting.election.service;

import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.entity.Position;
import com.udusug.voting.election.repository.CandidateRepository;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.repository.PositionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ElectionQueryServiceTest {
    @Mock VotingContractService contract;
    @Mock PositionRepository positions;
    @Mock CandidateRepository candidates;
    @Mock ElectionRepository elections;
    @Mock AdminRepository admins;
    @Mock AuditLogRepository audit;
    @InjectMocks ElectionServiceImp service;

    @Test void publicPositionsUseOnlyLatestElectionSession() {
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(Election.builder().sessionLabel("2026/2027").build()));
        when(positions.findBySessionLabelOrderByIdAsc("2026/2027")).thenReturn(List.of(Position.builder().id(2L).name("President").sessionLabel("2026/2027").build()));
        assertEquals("2026/2027", service.getPositions().getFirst().getSessionLabel());
        verify(positions).findBySessionLabelOrderByIdAsc("2026/2027");
    }

    @Test void publicPositionsAreEmptyWhenNoElectionExists() {
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.empty());
        assertTrue(service.getPositions().isEmpty());
        verifyNoInteractions(positions);
    }

    @Test void adminPositionsUseGreatestPreparedSessionOrOverride() {
        when(positions.findAllByOrderByIdAsc()).thenReturn(List.of(
                Position.builder().sessionLabel("2025/2026").build(),
                Position.builder().sessionLabel("2031/2032").build()));
        when(positions.findBySessionLabelOrderByIdAsc("2031/2032")).thenReturn(List.of());
        when(positions.findBySessionLabelOrderByIdAsc("2025/2026")).thenReturn(List.of());
        assertTrue(service.getAdminPositions(null).isEmpty());
        assertTrue(service.getAdminPositions("2025/2026").isEmpty());
        verify(positions).findBySessionLabelOrderByIdAsc("2031/2032");
    }

    @Test void electionResponseIncludesLagosTimeAndStatus() {
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(Election.builder()
                .sessionLabel("2026/2027")
                .startTime(OffsetDateTime.parse("2026-10-01T08:00:00Z"))
                .endTime(OffsetDateTime.parse("2026-10-01T16:00:00Z"))
                .closed(false).build()));
        var result = service.getLatestElection();
        assertEquals("2026-10-01T09:00+01:00", result.getStartTime().toString());
        assertEquals("ENDED", result.getStatus());
        assertNotNull(result.getServerTime());
        assertFalse(result.getClosed());
    }
}
