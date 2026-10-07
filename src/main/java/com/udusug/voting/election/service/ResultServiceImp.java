package com.udusug.voting.election.service;

import com.udusug.voting.blockchain.service.VotingContractService;
import com.udusug.voting.election.dto.CandidateResultDto;
import com.udusug.voting.election.dto.ResultsResponse;
import com.udusug.voting.election.dto.TurnoutResponse;
import com.udusug.voting.election.entity.Candidate;
import com.udusug.voting.election.repository.CandidateRepository;
import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.tuples.generated.Tuple3;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResultServiceImp implements ResultsService{

    private final VotingContractService votingContractService;
    private final CandidateRepository candidateRepository;

    @Override
    public ResultsResponse getResults(Long positionId) {
        log.info("Fetching results for positionId [{}]", positionId);

        try {
            Tuple3<List<BigInteger>, List<String>, List<BigInteger>> rawTuple =
                    votingContractService.getResults(positionId);

            List<BigInteger> candidateIds = rawTuple.component1();
            List<String> names = rawTuple.component2();
            List<BigInteger> voteCounts = rawTuple.component3();

            // Department is application data, so enrich blockchain results from the local candidate table.
            List<Long> localIds = candidateIds.stream().map(BigInteger::longValueExact).toList();
            Map<Long, Candidate> candidatesById = candidateRepository.findAllById(localIds).stream()
                    .collect(Collectors.toMap(Candidate::getId, Function.identity()));

            List<CandidateResultDto> candidateResults = new ArrayList<>();
            for (int i = 0; i < candidateIds.size(); i++) {
                Long candidateId = candidateIds.get(i).longValueExact();
                Candidate localCandidate = candidatesById.get(candidateId);
                candidateResults.add(CandidateResultDto.builder()
                        .candidateId(candidateId)
                        .name(names.get(i))
                        .department(localCandidate != null ? localCandidate.getDepartment() : null)
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
