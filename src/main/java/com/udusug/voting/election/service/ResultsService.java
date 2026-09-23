package com.udusug.voting.election.service;

import com.udusug.voting.election.dto.ResultsResponse;
import com.udusug.voting.election.dto.TurnoutResponse;

public interface ResultsService {

    /**
     * Reads position results directly from the smart contract.
     * Returns results if available or a clear "not available yet" response if open.
     */
    ResultsResponse getResults(Long positionId);

    /**
     * Reads turnout on-chain. Always public and active during voting.
     */
    TurnoutResponse getTurnout();
}
