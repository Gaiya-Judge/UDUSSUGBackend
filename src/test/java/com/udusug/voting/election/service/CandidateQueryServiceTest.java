package com.udusug.voting.election.service;

import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.entity.Candidate;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateQueryServiceTest {
    @Mock CandidateRepository candidates;
    @Mock PositionRepository positions;
    @Mock ElectionRepository elections;
    @Mock AdminRepository admins;
    @Mock AuditLogRepository audit;
    @Mock SessionGuard sessionGuard;
    @Mock VotingContractService contract;
    @InjectMocks CandidateServiceImp service;

    private Candidate candidate(long id, boolean active) {
        Position position = Position.builder().id(4L).name("President").sessionLabel("2026/2027").build();
        return Candidate.builder().id(id).name("Amina Yusuf").department("Computer Science")
                .position(position).active(active).build();
    }

    @Test void publicListUsesActiveQueryAndPopulatesPositionName() {
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(Election.builder().sessionLabel("2026/2027").build()));
        when(candidates.findActiveBySessionLabelWithPosition("2026/2027")).thenReturn(List.of(candidate(1, true)));
        var result = service.getAllCandidates(null);
        assertEquals("President", result.getFirst().getPositionName());
        verify(candidates).findActiveBySessionLabelWithPosition("2026/2027");
    }

    @Test void adminListUsesWorkingSessionAndReturnsActiveCandidatesOnly() {
        when(positions.findAllByOrderByIdAsc()).thenReturn(List.of(Position.builder().sessionLabel("2031/2032").build()));
        when(candidates.findActiveForSession("2031/2032")).thenReturn(List.of(candidate(1, true)));
        var result = service.getAllCandidatesForAdmin(null);
        assertEquals(1, result.size());
        assertEquals("President", result.getFirst().getPositionName());
        assertEquals("2026/2027", result.getFirst().getSessionLabel());
        verify(candidates).findActiveForSession("2031/2032");
    }
}
