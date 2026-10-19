package com.udusug.voting.admin.service;

import com.udusug.voting.admin.dto.ResetBallotResponse;

public interface AdminVoterService {
    ResetBallotResponse resetBallot(String adminEmail, String admissionNumber);
}
