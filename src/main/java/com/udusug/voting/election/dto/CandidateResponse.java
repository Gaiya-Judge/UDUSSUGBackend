package com.udusug.voting.election.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CandidateResponse {

    private Long candidateId;
    private String name;
    private String department;
    private Long positionId;
    private String positionName;
    private String photoUrl;
}
