package com.udusug.voting.election.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResultsResponse {

    private Long positionId;
    private String status; // "RESULTS_AVAILABLE" or "NOT_AVAILABLE_YET"
    private String message;
    private List<CandidateResultDto> candidates;
}
