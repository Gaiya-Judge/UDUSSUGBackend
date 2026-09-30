package com.udusug.voting.election.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "positions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Position {

    @Id // Matches on-chain ID
    private Long id;

    @Column(nullable = false)
    private String sessionLabel;

    @Column(nullable = false)
    private String name;
}
