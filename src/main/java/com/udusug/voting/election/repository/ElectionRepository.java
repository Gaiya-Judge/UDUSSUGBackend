package com.udusug.voting.election.repository;

import com.udusug.voting.election.entity.Election;
import com.udusug.voting.voter.entity.VotingToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ElectionRepository  extends JpaRepository<Election, Long> {
    /**
     * Finds the single latest Election entity ordered by auto-increment ID descending.
     */
    Optional<Election> findFirstByOrderByIdDesc();
}
