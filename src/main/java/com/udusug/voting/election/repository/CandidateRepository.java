package com.udusug.voting.election.repository;

import com.udusug.voting.election.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    @Query("select c from Candidate c join fetch c.position")
    List<Candidate> findAllWithPosition();

    @Query("select c from Candidate c join fetch c.position where c.position.sessionLabel = :sessionLabel and c.active = true")
    List<Candidate> findActiveBySessionLabelWithPosition(@Param("sessionLabel") String sessionLabel);

    @Query("select c from Candidate c join fetch c.position where c.position.id = :positionId and c.position.sessionLabel = :sessionLabel and c.active = true")
    List<Candidate> findActiveByPositionAndSessionWithPosition(@Param("positionId") Long positionId, @Param("sessionLabel") String sessionLabel);
    List<Candidate> findByPositionId(Long positionId);

    List<Candidate> findByPosition_SessionLabel(String sessionLabel);

    List<Candidate> findByPosition_IdAndPosition_SessionLabel(Long positionId, String sessionLabel);
}
