package com.udusug.voting.voter.repository;

import com.udusug.voting.voter.entity.OtpVerification;
import com.udusug.voting.voter.entity.VoterRoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByVoterRollAndVerifiedFalseOrderByExpiresAtDesc(VoterRoll voterRoll);
}
