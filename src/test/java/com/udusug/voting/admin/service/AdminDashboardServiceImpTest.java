package com.udusug.voting.admin.service;

import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.service.ResultsService;
import com.udusug.voting.election.dto.TurnoutResponse;
import com.udusug.voting.token.repository.VotingTokenRepository;
import com.udusug.voting.voter.entity.EligibilityStatus;
import com.udusug.voting.voter.repository.VoterRollRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.TimeZone;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceImpTest {
    @Mock ElectionRepository elections;
    @Mock VoterRollRepository voters;
    @Mock ResultsService results;
    @Mock VotingTokenRepository tokens;
    @InjectMocks AdminDashboardServiceImp service;

    @Test void countsBallotsAndTokenStatesSinceStartIncludingTokenIssuedJustAfterStart() {
        TimeZone previous = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("Africa/Lagos"));
        try {
        ZoneId lagos = ZoneId.of("Africa/Lagos");
        OffsetDateTime start = OffsetDateTime.of(2026, 10, 12, 8, 0, 0, 0, java.time.ZoneOffset.ofHours(1));
        when(results.getTurnout()).thenReturn(TurnoutResponse.builder().totalVotesCast(7).build());
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(Election.builder().sessionLabel("2030/2031")
                .startTime(start).endTime(start.plusHours(2)).closed(false).build()));
        when(voters.countByEligibilityStatus(EligibilityStatus.ACTIVE)).thenReturn(9L);
        when(voters.countByBallotSession("2030/2031")).thenReturn(4L);
        when(tokens.countByUsedFalseAndExpiresAtAfterAndIssuedAtGreaterThanEqual(any(), any())).thenReturn(3L);
        when(tokens.countByUsedFalseAndExpiresAtBeforeAndIssuedAtGreaterThanEqual(any(), any())).thenReturn(2L);

        var response = service.getDashboard();

        assertEquals(4L, response.getBallotsIssued());
        assertEquals(3L, response.getActiveTokens());
        assertEquals(2L, response.getExpiredUnusedTokens());
        LocalDateTime expectedStart = start.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
        verify(tokens).countByUsedFalseAndExpiresAtAfterAndIssuedAtGreaterThanEqual(any(), eq(expectedStart));
        verify(tokens).countByUsedFalseAndExpiresAtBeforeAndIssuedAtGreaterThanEqual(any(), eq(expectedStart));
        assertEquals(8, expectedStart.getHour());
        LocalDateTime tokenIssuedJustAfterStart = expectedStart.plusNanos(1);
        assertTrue(tokenIssuedJustAfterStart.isAfter(expectedStart));
        } finally {
            TimeZone.setDefault(previous);
        }
    }
}

