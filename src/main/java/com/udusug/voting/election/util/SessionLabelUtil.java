package com.udusug.voting.election.util;

import com.udusug.voting.exception.ApiException;
import org.springframework.http.HttpStatus;

public class SessionLabelUtil {

    private SessionLabelUtil() {
        // Private constructor for utility class
    }

    public static String validateAndNormalize(String sessionLabel) {
        if (sessionLabel == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Session label is required");
        }

        String trimmed = sessionLabel.trim();

        if (!trimmed.matches("^\\d{4}/\\d{4}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Session label must be in YYYY/YYYY format");
        }

        String[] parts = trimmed.split("/");
        int firstYear = Integer.parseInt(parts[0]);
        int secondYear = Integer.parseInt(parts[1]);

        if (secondYear != firstYear + 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid session label: second year must be first year + 1");
        }

        return trimmed;
    }
}
