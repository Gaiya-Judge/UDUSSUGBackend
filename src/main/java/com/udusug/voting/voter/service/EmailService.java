package com.udusug.voting.voter.service;

public interface EmailService {
    /**
     * Sends a plain 6-digit OTP code to the voter's registered email address via SMTP.
     */
    void sendOtpEmail(String recipientEmail, String otpCode);
}
