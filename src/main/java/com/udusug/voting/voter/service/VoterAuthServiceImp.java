package com.udusug.voting.voter.service;

import com.udusug.voting.exception.ApiException;
import com.udusug.voting.exception.VoterIneligibleException;
import com.udusug.voting.voter.entity.EligibilityStatus;
import com.udusug.voting.voter.entity.VoterRoll;
import com.udusug.voting.voter.repository.VoterRollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoterAuthServiceImp implements VoterAuthService{

    private final VoterRollRepository voterRollRepository;

    private static final String GENERIC_REJECTION_MESSAGE = "Invalid admission number or voter account is not active";


    @Override
    public VoterRoll checkAdmissionNumber(String admissionNumber) {

        String trimmedAdmission = admissionNumber.trim().toUpperCase();
        log.info("Processing voter lookup for admission number: {}", trimmedAdmission);

        // 1. Check existence in VoterRoll (FR1, FR4)
        VoterRoll voter = voterRollRepository.findByAdmissionNumber(trimmedAdmission)
                .orElseThrow(() -> {
                    log.warn("Voter lookup failed: Admission number [{}] not found in VoterRoll", trimmedAdmission);
                    return new ApiException(HttpStatus.NOT_FOUND, GENERIC_REJECTION_MESSAGE);
                });

        // 2. Check eligibility status (FR3)
        if (voter.getEligibilityStatus() != EligibilityStatus.ACTIVE) {
            log.warn("Voter lookup failed: Voter [{}] exists but status is {}", trimmedAdmission, voter.getEligibilityStatus());
            throw new ApiException(HttpStatus.UNAUTHORIZED ,GENERIC_REJECTION_MESSAGE);
        }

        log.info("Voter lookup successful: Admission number [{}] is ACTIVE", trimmedAdmission);
        return voter;
    }
}
