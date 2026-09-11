package com.udusug.voting.voter.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "voter_rolls")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoterRoll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String admissionNumber;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EligibilityStatus eligibilityStatus;

    private LocalDateTime tokenIssuedAt;

    @Column(nullable = false)
    private boolean tokenLockActive;
}
