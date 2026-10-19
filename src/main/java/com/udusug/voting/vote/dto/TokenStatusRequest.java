package com.udusug.voting.vote.dto;

import jakarta.validation.constraints.NotBlank;

public record TokenStatusRequest(@NotBlank String token) {}
