package com.udusug.voting.voter.repository;

import com.udusug.voting.voter.entity.VoterRoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import com.udusug.voting.voter.entity.EligibilityStatus;

@Repository
public interface VoterRollRepository extends JpaRepository<VoterRoll, Long> {

    Optional<VoterRoll> findByAdmissionNumber(String admissionNumber);
    boolean existsByAdmissionNumber(String admissionNumber);
    long countByEligibilityStatus(EligibilityStatus eligibilityStatus);
    long countByBallotSession(String ballotSession);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE VoterRoll v SET v.ballotSession = :session WHERE v.id = :id AND (v.ballotSession IS NULL OR v.ballotSession <> :session)")
    int claimBallot(@Param("id") Long id, @Param("session") String session);
}
