package com.udusug.voting.election.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ElectionResponse {
    private String sessionLabel;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private boolean closed;
}
