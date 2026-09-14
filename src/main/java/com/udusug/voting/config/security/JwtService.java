package com.udusug.voting.config.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    // 2 hours in milliseconds (2 * 60 * 60 * 1000)
    private static final long TOKEN_EXPIRATION_MS = 7_200_000L;

    private final SecretKey secretKey;

    public JwtService(@Value("${app.jwt.secret}") String secret) {
        // Enforce a minimum 256-bit key length for HMAC-SHA algorithms
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String email) {
        log.info("Issuing new 2-hour JWT for admin: {}", email);
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + TOKEN_EXPIRATION_MS);

        return Jwts.builder()
                .subject(email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }


    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }


    public boolean isTokenValid(String token, String email) {
        try {
            String extractedEmail = extractEmail(token);
            boolean isValid = extractedEmail.equals(email) && !isTokenExpired(token);
            if (!isValid) {
                log.warn("JWT validation failed for email claim: {}", email);
            }
            return isValid;
        } catch (ExpiredJwtException e) {
            log.warn("JWT has expired for user: {}", email);
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT structure or signature for user: {}", email);
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claimsResolver.apply(claims);
    }
}
