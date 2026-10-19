package com.udusug.voting.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {
    private String sessionLabel;
    private String status;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private OffsetDateTime serverTime;
    private Long totalVotesCast;
    private long totalEligibleVoters;
    private long ballotsIssued;
    private long activeTokens;
    private long expiredUnusedTokens;
}
