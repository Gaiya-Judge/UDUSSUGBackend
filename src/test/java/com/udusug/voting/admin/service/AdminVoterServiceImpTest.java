package com.udusug.voting.admin.service;

import com.udusug.voting.admin.entity.Admin;
import com.udusug.voting.admin.repository.AdminRepository;
import com.udusug.voting.audit.repository.AuditLogRepository;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.repository.VoterRollRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import java.time.OffsetDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminVoterServiceImpTest {
    @Mock VoterRollRepository voters;
    @Mock ElectionRepository elections;
    @Mock AdminRepository admins;
    @Mock AuditLogRepository audits;
    @InjectMocks AdminVoterServiceImp service;

    @Test void resetBallotSuccessNormalizesAdmissionAuditsAndClearsSession() {
        VoterRoll voter = voter("2030/2031");
        when(voters.findByAdmissionNumber("ABC123")).thenReturn(Optional.of(voter));
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(ongoingElection()));
        when(admins.findByEmail("admin@example.com")).thenReturn(Optional.of(Admin.builder().email("admin@example.com").build()));
        var response = service.resetBallot("admin@example.com", " abc123 ");
        assertEquals("Ballot reset successfully", response.message());
        assertNull(voter.getBallotSession());
        verify(voters).save(voter);
        verify(audits).save(argThat(a -> "RESET_BALLOT".equals(a.getAction()) && a.getDetails().contains("ABC123 2030/2031")));
    }

    @Test void resetBallotReturns404ForUnknownVoter() {
        when(voters.findByAdmissionNumber("ABC123")).thenReturn(Optional.empty());
        assertStatus(HttpStatus.NOT_FOUND, () -> service.resetBallot("admin@example.com", "abc123"));
        verifyNoInteractions(elections, admins, audits);
    }

    @Test void resetBallotRejectsWhenElectionNotOngoing() {
        when(voters.findByAdmissionNumber("ABC123")).thenReturn(Optional.of(voter("2030/2031")));
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.empty());
        assertStatus(HttpStatus.CONFLICT, () -> service.resetBallot("admin@example.com", "abc123"));
        verify(voters, never()).save(any());
    }

    @Test void resetBallotRejectsWhenVoterHasNoBallotForCurrentSession() {
        when(voters.findByAdmissionNumber("ABC123")).thenReturn(Optional.of(voter("2029/2030")));
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(ongoingElection()));
        assertStatus(HttpStatus.CONFLICT, () -> service.resetBallot("admin@example.com", "abc123"));
        verifyNoInteractions(admins, audits);
        verify(voters, never()).save(any());
    }

    private static void assertStatus(HttpStatus expected, org.junit.jupiter.api.function.Executable call) {
        assertEquals(expected, assertThrows(ApiException.class, call).getStatus());
    }
    private static VoterRoll voter(String session) {
        return VoterRoll.builder().id(1L).admissionNumber("ABC123").ballotSession(session).build();
    }
    private static Election ongoingElection() {
        return Election.builder().sessionLabel("2030/2031").startTime(OffsetDateTime.now().minusHours(1))
                .endTime(OffsetDateTime.now().plusHours(1)).closed(false).build();
    }
}
