package com.udusug.voting.voter.repository;

import com.udusug.voting.voter.entity.VoterRoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoterRollRepository extends JpaRepository<VoterRoll, Long> {

    Optional<VoterRoll> findByAdmissionNumber(String admissionNumber);
    boolean existsByAdmissionNumber(String admissionNumber);
}
