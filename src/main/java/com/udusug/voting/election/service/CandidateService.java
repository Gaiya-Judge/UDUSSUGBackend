package com.udusug.voting.election.service;

import com.udusug.voting.admin.dto.AdminCandidateResponse;
import com.udusug.voting.admin.dto.AdminWriteResponse;
import com.udusug.voting.admin.dto.UpdateCandidateRequest;
import com.udusug.voting.election.dto.CandidateResponse;

import java.util.List;

public interface CandidateService {

    /**
     * Retrieves all candidates formatted for ballot rendering.
     * Optionally filters by positionId if provided.
     */
    List<CandidateResponse> getAllCandidates(Long positionId);

    List<AdminCandidateResponse> getAllCandidatesForAdmin(String sessionLabel);

    AdminWriteResponse updateCandidate(String adminEmail, Long candidateId, UpdateCandidateRequest request);

    AdminWriteResponse deleteCandidate(String adminEmail, Long candidateId);
}
