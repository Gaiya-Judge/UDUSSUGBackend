package com.udusug.voting.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCandidateResponse {

    private Long id;
    private String name;
    private String department;
    private Long positionId;
    private String positionName;
    private String sessionLabel;
}
