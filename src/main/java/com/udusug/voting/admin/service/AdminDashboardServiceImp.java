package com.udusug.voting.admin.service;

import com.udusug.voting.admin.dto.AdminDashboardResponse;
import com.udusug.voting.election.entity.Election;
import com.udusug.voting.election.repository.ElectionRepository;
import com.udusug.voting.election.service.ElectionStatusResolver;
import com.udusug.voting.election.service.ResultsService;
import com.udusug.voting.exception.ApiException;
import com.udusug.voting.voter.entity.EligibilityStatus;
import com.udusug.voting.voter.repository.VoterRollRepository;
import com.udusug.voting.token.repository.VotingTokenRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImp implements AdminDashboardService {
    private final ElectionRepository electionRepository;
    private final VoterRollRepository voterRollRepository;
    private final ResultsService resultsService;
    private final VotingTokenRepository votingTokenRepository;

    @Override
    public AdminDashboardResponse getDashboard() {
        OffsetDateTime now = OffsetDateTime.now(ZoneId.of("Africa/Lagos"));
        Election latest = electionRepository.findFirstByOrderByIdDesc().orElse(null);
        Long votes = null;
        try {
            votes = resultsService.getTurnout().getTotalVotesCast();
        } catch (Exception ex) {
            log.warn("Unable to retrieve blockchain turnout for admin dashboard", ex);
        }
        return AdminDashboardResponse.builder()
                .sessionLabel(latest == null ? null : latest.getSessionLabel())
                .status(ElectionStatusResolver.resolve(latest, now))
                .startTime(latest == null ? null : latest.getStartTime())
                .endTime(latest == null ? null : latest.getEndTime())
                .serverTime(now)
                .totalVotesCast(votes)
                .totalEligibleVoters(voterRollRepository.countByEligibilityStatus(EligibilityStatus.ACTIVE))
                .ballotsIssued(latest == null ? 0 : voterRollRepository.countByBallotSession(latest.getSessionLabel()))
                .activeTokens(latest == null ? 0 : votingTokenRepository.countByUsedFalseAndExpiresAtAfterAndIssuedAtGreaterThanEqual(LocalDateTime.now(), latest.getStartTime().atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime()))
                .expiredUnusedTokens(latest == null ? 0 : votingTokenRepository.countByUsedFalseAndExpiresAtBeforeAndIssuedAtGreaterThanEqual(LocalDateTime.now(), latest.getStartTime().atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime()))
                .build();
    }
}
