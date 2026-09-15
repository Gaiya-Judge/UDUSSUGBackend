package com.udusug.voting.voter.service;

import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImp implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@udusug.edu.ng}")
    private String fromEmail;

    @Override
    public void sendOtpEmail(String recipientEmail, String otpCode) {

        log.info("Initiating OTP email delivery to voter email: {}", recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipientEmail);
            message.setSubject("UDU SUG Voting System - Authentication OTP");
            message.setText("Dear Voter,\n\n"
                    + "Your One-Time Password (OTP) for voter authentication is: " + otpCode + "\n\n"
                    + "This code is valid for 5 minutes. Do not share this OTP with anyone.\n\n"
                    + "UDU SUG Electoral Committee");

            mailSender.send(message);

            // Logging compliance: Never log the plain OTP code!
            log.info("Successfully sent OTP email to voter: {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to [{}]:", recipientEmail, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to deliver OTP email. Please try again later.");
        }

    }
}
