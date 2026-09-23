package com.udusug.voting.election.service;

import com.udusug.voting.admin.dto.AddCandidateRequest;
import com.udusug.voting.admin.dto.AddPositionRequest;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.SetElectionTimesRequest;

public interface ElectionService {

    /**
     * Adds a position on-chain, captures the assigned ID, and caches it locally.
     */
    AdminWriteResponse addPosition(String adminEmail, AddPositionRequest request);

    /**
     * Adds a candidate on-chain under a position, captures assigned ID, and caches it locally.
     */
    AdminWriteResponse addCandidate(String adminEmail, AddCandidateRequest request);

    /**
     * Sets election start/end times on-chain and updates local Election cache.
     */
    AdminWriteResponse setElectionTimes(String adminEmail, SetElectionTimesRequest request);

    /**
     * Issues closeElection transaction on-chain as admin housekeeping action,
     * syncs local Election.closed flag cache, and writes audit entry.
     */
    AdminWriteResponse closeElection(String adminEmail);
}
