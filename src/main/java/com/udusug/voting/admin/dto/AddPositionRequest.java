package com.udusug.voting.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddPositionRequest {

    @NotBlank(message = "Session label is required")
    @Pattern(regexp = "^\\d{4}/\\d{4}$", message = "Session label must be in YYYY/YYYY format")
    private String sessionLabel;

    @NotBlank(message = "Position name is required")
    private String name;
}
