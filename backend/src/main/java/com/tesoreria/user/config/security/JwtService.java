package com.tesoreria.user.config.security;

import com.tesoreria.organization.config.TenantUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:" + SecurityConstants.TOKEN_EXPIRATION_MS + "}") long expirationMs) {

        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException(
                    "JWT_SECRET debe tener al menos 32 caracteres");
        }

        this.key = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8));

        this.expirationMs = expirationMs;
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(userDetails, null);
    }

    public String generateToken(UserDetails userDetails, UUID tokenFamilyId) {

        Date now = new Date();

        var builder = Jwts.builder()
                .setId(UUID.randomUUID().toString())
                .setSubject(userDetails.getUsername())
                .claim(
                        "authorities",
                        userDetails.getAuthorities()
                                .stream()
                                .filter(authority -> authority != null)
                                .map(authority -> authority.getAuthority())
                                .filter(authority -> authority != null)
                                .toList())
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expirationMs));
        if (userDetails instanceof TenantUserDetails tenantUser) {
            builder.claim("userId", tenantUser.getUserId())
                    .claim("organizationId", tenantUser.getOrganizationId());
        }
        if (tokenFamilyId != null) {
            builder.claim("tokenFamilyId", tokenFamilyId.toString());
        }
        return builder
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(
                token,
                claims -> claims.getSubject());
    }

    public ParsedToken parseToken(String token) {
        Claims claims = parseClaims(token);
        Number userId = claims.get("userId", Number.class);
        Number organizationId = claims.get("organizationId", Number.class);
        String tokenFamilyId = claims.get("tokenFamilyId", String.class);
        return new ParsedToken(claims.getSubject(), claims.getIssuedAt(), claims.getExpiration(),
                userId == null ? null : userId.longValue(),
                organizationId == null ? null : organizationId.longValue(),
                tokenFamilyId == null ? null : UUID.fromString(tokenFamilyId));
    }

    public boolean isTokenValid(
            String token,
            UserDetails userDetails) {
        return isTokenValid(parseToken(token), userDetails);
    }

    public boolean isTokenValid(
            ParsedToken token,
            UserDetails userDetails) {
        return token.username() != null
                && userDetails.getUsername().equalsIgnoreCase(token.username())
                && (!(userDetails instanceof TenantUserDetails tenantUser)
                    || tenantUser.isOrganizationActive())
                && token.expiresAt().after(new Date());
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public Date extractExpiration(String token) {
        return extractClaim(
                token,
                claims -> claims.getExpiration());
    }

    public Date extractIssuedAt(String token) {
        return extractClaim(
                token,
                claims -> claims.getIssuedAt());
    }

    private <T> T extractClaim(
            String token,
            Function<Claims, T> resolver) {
        return resolver.apply(parseClaims(token));
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public record ParsedToken(
            String username,
            Date issuedAt,
            Date expiresAt,
            Long userId,
            Long organizationId,
            UUID tokenFamilyId) {
        public ParsedToken(String username, Date issuedAt, Date expiresAt) {
            this(username, issuedAt, expiresAt, null, null, null);
        }
    }
}
