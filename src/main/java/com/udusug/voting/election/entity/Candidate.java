package com.udusug.voting.election.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "candidates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Candidate {

    @Id // Matches on-chain ID
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Column(nullable = false)
    private String department;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    private String photoUrl;
}
