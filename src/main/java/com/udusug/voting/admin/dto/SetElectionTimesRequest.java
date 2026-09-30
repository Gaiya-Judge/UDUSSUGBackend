package com.udusug.voting.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SetElectionTimesRequest {

    @NotBlank(message = "Session label is required")
    @Pattern(regexp = "^\\d{4}/\\d{4}$", message = "Session label must be in YYYY/YYYY format")
    private String sessionLabel;

    @NotNull(message = "Start time is required")
    private OffsetDateTime startTime;

    @NotNull(message = "End time is required")
    private OffsetDateTime endTime;
}
