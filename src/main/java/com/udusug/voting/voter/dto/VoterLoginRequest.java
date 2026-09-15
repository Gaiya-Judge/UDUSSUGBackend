package com.udusug.voting.voter.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoterLoginRequest {

    @NotBlank(message = "Admission number is required")
    private String admissionNumber;
}
