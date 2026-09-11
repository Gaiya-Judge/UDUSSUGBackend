package com.udusug.voting.election.repository;

import com.udusug.voting.election.entity.Election;
import com.udusug.voting.voter.entity.VotingToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectionRepository  extends JpaRepository<Election, Long> {
}
