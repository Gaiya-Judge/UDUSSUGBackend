package com.udusug.voting.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetBallotRequest(@NotBlank String admissionNumber) {}
