package com.udusug.voting.voter.repository;

import com.udusug.voting.voter.entity.VotingToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VotingTokenRepository extends JpaRepository<VotingToken, Long> {
    Optional<VotingToken> findByTokenHash(String tokenHash);
}
