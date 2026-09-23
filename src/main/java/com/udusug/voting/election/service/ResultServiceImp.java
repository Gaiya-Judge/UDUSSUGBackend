package com.udusug.voting.election.service;

import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.dto.CandidateResultDto;
import com.udusug.voting.election.dto.ResultsResponse;
import com.udusug.voting.election.dto.TurnoutResponse;
import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.tuples.generated.Tuple3;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResultServiceImp implements ResultsService{

    private final VotingContractService votingContractService;

    @Override
    public ResultsResponse getResults(Long positionId) {
        log.info("Fetching results for positionId [{}]", positionId);

        try {
            Tuple3<List<BigInteger>, List<String>, List<BigInteger>> rawTuple =
                    votingContractService.getResults(positionId);

            List<BigInteger> candidateIds = rawTuple.component1();
            List<String> names = rawTuple.component2();
            List<BigInteger> voteCounts = rawTuple.component3();

            List<CandidateResultDto> candidateResults = new ArrayList<>();
            for (int i = 0; i < candidateIds.size(); i++) {
                candidateResults.add(CandidateResultDto.builder()
                        .candidateId(candidateIds.get(i).longValueExact())
                        .name(names.get(i))
                        .voteCount(voteCounts.get(i).longValueExact())
                        .build());
            }

            return ResultsResponse.builder()
                    .positionId(positionId)
                    .status("RESULTS_AVAILABLE")
                    .message("Results successfully retrieved from blockchain")
                    .candidates(candidateResults)
                    .build();

        } catch (ApiException e) {
            // Handle expected "Election is still open" revert translation
            if (e.getMessage() != null && e.getMessage().contains("still open")) {
                log.info("Results requested for positionId [{}] while election is still active on-chain", positionId);
                return ResultsResponse.builder()
                        .positionId(positionId)
                        .status("NOT_AVAILABLE_YET")
                        .message("Election is still open. Results will become available automatically after the election deadline passes.")
                        .candidates(List.of())
                        .build();
            }
            throw e;
        }
    }

    @Override
    public TurnoutResponse getTurnout() {
        log.info("Fetching turnout on-chain");
        long totalVotes = votingContractService.getTurnout();
        return new TurnoutResponse(totalVotes);
    }
}
