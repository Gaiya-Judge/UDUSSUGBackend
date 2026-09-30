package com.udusug.voting.election.repository;

import com.udusug.voting.election.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    List<Candidate> findByPositionId(Long positionId);

    List<Candidate> findByPosition_SessionLabel(String sessionLabel);

    List<Candidate> findByPosition_IdAndPosition_SessionLabel(Long positionId, String sessionLabel);
}
