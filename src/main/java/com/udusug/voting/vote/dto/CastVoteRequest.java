package com.udusug.voting.vote.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CastVoteRequest {

    @NotBlank(message = "Voting token is required")
    private String token;

    @NotEmpty(message = "At least one position selection is required")
    private List<Long> positionIds;

    @NotEmpty(message = "At least one candidate selection is required")
    private List<Long> candidateIds;
}
