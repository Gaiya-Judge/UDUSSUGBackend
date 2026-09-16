package com.udusug.voting.voter.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerifyRequest {

    @NotBlank(message = "Admission number is required")
    private String admissionNumber;

    @NotBlank(message = "OTP code is required")
    private String otpCode;
}
