package com.udusug.voting.token.service;

import java.time.LocalDateTime;

public record TokenStatusResponse(String status, LocalDateTime expiresAt, String transactionHash) {}
