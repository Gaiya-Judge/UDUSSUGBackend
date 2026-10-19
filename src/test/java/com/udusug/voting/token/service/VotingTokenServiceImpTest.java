package com.udusug.voting.token.service;

import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.exception.ApiException;
import com.udusug.voting.token.entity.VotingToken;
import com.udusug.voting.token.repository.VotingTokenRepository;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.repository.VoterRollRepository;
import com.udusug.voting.voter.util.HashUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VotingTokenServiceImpTest {
    @Mock VotingTokenRepository tokens;
    @Mock VoterRollRepository voters;
    @Mock ElectionRepository elections;
    @Mock VotingContractService contract;
    @InjectMocks VotingTokenServiceImp service;

    @Test void issueRejectsWhenElectionIsNotOngoing() {
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class, () -> service.issueToken(VoterRoll.builder().id(1L).build()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verifyNoInteractions(voters, tokens);
    }

    @Test void issueStopsWhenAtomicClaimWasAlreadyTaken() {
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(ongoingElection()));
        when(voters.claimBallot(1L, "2030/2031")).thenReturn(0);
        ApiException ex = assertThrows(ApiException.class, () -> service.issueToken(VoterRoll.builder().id(1L).build()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verifyNoInteractions(tokens);
    }

    @Test void olderBallotSessionCanClaimForNewOngoingSession() {
        VoterRoll voter = VoterRoll.builder().id(1L).ballotSession("2029/2030").build();
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.of(ongoingElection()));
        when(voters.claimBallot(1L, "2030/2031")).thenReturn(1);
        when(tokens.save(any(VotingToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.issueToken(voter);

        assertNotNull(response.getVotingToken());
        verify(voters).claimBallot(1L, "2030/2031");
        verify(tokens).save(any(VotingToken.class));
    }

    @Test void tokenStatusUnknown() {
        when(tokens.findByTokenHash(anyString())).thenReturn(Optional.empty());
        assertEquals("UNKNOWN", service.getTokenStatus("0xabc").status());
        verifyNoInteractions(contract);
    }

    @Test void tokenStatusValidExpiredAndUsed() {
        String hash = HashUtils.sha256("0xabc");
        when(tokens.findByTokenHash(hash)).thenReturn(Optional.of(token(LocalDateTime.now().plusMinutes(10), false)));
        when(contract.isTokenUsedOnChain(hash)).thenReturn(false);
        assertEquals("VALID", service.getTokenStatus("0xabc").status());
        when(tokens.findByTokenHash(hash)).thenReturn(Optional.of(token(LocalDateTime.now().minusMinutes(1), false)));
        assertEquals("EXPIRED", service.getTokenStatus("0xabc").status());
        VotingToken used = token(LocalDateTime.now().minusMinutes(1), true);
        used.setTransactionHash("tx");
        when(tokens.findByTokenHash(hash)).thenReturn(Optional.of(used));
        var status = service.getTokenStatus("0xabc");
        assertEquals("USED", status.status());
        assertEquals("tx", status.transactionHash());
    }

    @Test void tokenStatusReconcilesOnChainUse() {
        String hash = HashUtils.sha256("0xabc");
        VotingToken token = token(LocalDateTime.now().plusMinutes(5), false);
        when(tokens.findByTokenHash(hash)).thenReturn(Optional.of(token));
        when(contract.isTokenUsedOnChain(hash)).thenReturn(true);
        var result = service.getTokenStatus("0xabc");
        assertEquals("USED", result.status());
        assertNull(result.transactionHash());
        assertTrue(token.isUsed());
        verify(tokens).save(token);
    }

    private static VotingToken token(LocalDateTime expires, boolean used) {
        return VotingToken.builder().tokenHash("hash").issuedAt(LocalDateTime.now()).expiresAt(expires).used(used).build();
    }
    private static Election ongoingElection() {
        return Election.builder().sessionLabel("2030/2031").startTime(OffsetDateTime.now().minusHours(1))
                .endTime(OffsetDateTime.now().plusHours(1)).closed(false).build();
    }
}
