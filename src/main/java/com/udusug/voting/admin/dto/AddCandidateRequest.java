package com.udusug.voting.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddCandidateRequest {

    @NotNull(message = "Position ID is required")
    private Long positionId;

    @NotBlank(message = "Candidate name is required")
    private String name;

    @NotBlank(message = "candidate department required")
    private String department;
}
