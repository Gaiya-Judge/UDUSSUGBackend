package com.udusug.voting.token.repository;

import com.udusug.voting.token.entity.VotingToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VotingTokenRepository extends JpaRepository<VotingToken, Long> {
    Optional<VotingToken> findByTokenHash(String tokenHash);
    long countByUsedFalseAndExpiresAtAfterAndIssuedAtGreaterThanEqual(java.time.LocalDateTime now, java.time.LocalDateTime start);
    long countByUsedFalseAndExpiresAtBeforeAndIssuedAtGreaterThanEqual(java.time.LocalDateTime now, java.time.LocalDateTime start);
}
