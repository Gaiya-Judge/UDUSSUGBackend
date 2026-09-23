package com.udusug.voting.election.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateResultDto {

    private Long candidateId;
    private String name;
    private Long voteCount;
}
