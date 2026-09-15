package com.udusug.voting.voter.service;

import com.udusug.voting.voter.entity.VoterRoll;

public interface VoterAuthService {

    /**
     * Checks admission number existence and eligibility status in VoterRoll.
     * Prevents account enumeration by returning identical generic messages externally.
     */
    VoterRoll checkAdmissionNumber(String admissionNumber);
}
