package com.udusug.voting.voter.util;

import java.security.SecureRandom;

public class OtpGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Generates a 6-digit numeric OTP code (range 100000 to 999999).
     */
    public static String generate6DigitOtp() {
        int otp = 100_000 + SECURE_RANDOM.nextInt(900_000);
        return String.valueOf(otp);
    }
}
