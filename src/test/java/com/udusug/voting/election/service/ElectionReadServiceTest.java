package com.udusug.voting.election.service;

import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.repository.PositionRepository;
import org.junit.jupiter.api.Test;
import java.time.OffsetDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ElectionReadServiceTest {
    private final OffsetDateTime now = OffsetDateTime.parse("2026-10-08T12:00:00Z");

    @Test
    void resolvesAllElectionStatuses() {
        assertEquals("NOT_SCHEDULED", ElectionStatusResolver.resolve(null, now));
        assertEquals("UPCOMING", ElectionStatusResolver.resolve(election(now.plusHours(1), now.plusHours(2), false), now));
        assertEquals("ONGOING", ElectionStatusResolver.resolve(election(now.minusHours(1), now.plusHours(1), false), now));
        assertEquals("ENDED", ElectionStatusResolver.resolve(election(now.minusHours(2), now.minusHours(1), false), now));
        assertEquals("ENDED", ElectionStatusResolver.resolve(election(now.minusHours(1), now.plusHours(1), true), now));
    }

    @Test
    void returnsNullElectionFieldsAndNoPositionsWhenNoElectionExists() {
        ElectionRepository elections = mock(ElectionRepository.class);
        PositionRepository positions = mock(PositionRepository.class);
        when(elections.findFirstByOrderByIdDesc()).thenReturn(Optional.empty());
        ElectionServiceImp service = new ElectionServiceImp(null, positions, null, elections, null, null);

        var result = service.getLatestElection();
        assertEquals("NOT_SCHEDULED", result.getStatus());
        assertNull(result.getSessionLabel());
        assertNull(result.getStartTime());
        assertNull(result.getEndTime());
        assertNull(result.getClosed());
        assertNotNull(result.getServerTime());
        assertTrue(service.getPositions().isEmpty());
        verifyNoInteractions(positions);
    }

    private Election election(OffsetDateTime start, OffsetDateTime end, boolean closed) {
        return Election.builder().sessionLabel("2026/2027").startTime(start).endTime(end).closed(closed).build();
    }
}
