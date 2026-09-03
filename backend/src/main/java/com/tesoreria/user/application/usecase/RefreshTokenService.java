package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class RefreshTokenService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserTokenJpaRepository tokenRepository;
    private final UserJpaRepository userRepository;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final long expirationSeconds;
    private final long reuseGraceSeconds;

    public RefreshTokenService(UserTokenJpaRepository tokenRepository, UserJpaRepository userRepository,
            CustomUserDetailsService userDetailsService, JwtService jwtService,
            @Value("${app.refresh-token.expiration-seconds:2592000}") long expirationSeconds) {
        this(tokenRepository, userRepository, userDetailsService, jwtService, expirationSeconds, 10);
    }

    @Autowired
    public RefreshTokenService(UserTokenJpaRepository tokenRepository, UserJpaRepository userRepository,
            CustomUserDetailsService userDetailsService, JwtService jwtService,
            @Value("${app.refresh-token.expiration-seconds:604800}") long expirationSeconds,
            @Value("${app.refresh-token.reuse-grace-seconds:10}") long reuseGraceSeconds) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.expirationSeconds = expirationSeconds;
        this.reuseGraceSeconds = reuseGraceSeconds;
    }

    @Transactional
    public IssuedTokens issue(String correo) {
        return issue(correo, UUID.randomUUID(), null, null);
    }

    @Transactional
    public IssuedTokens issueForUserId(Long userId, String userAgent, String ipAddress) {
        var user = userRepository.findById(userId).orElseThrow(this::invalidToken);
        return issue(user, UUID.randomUUID(), userAgent, ipAddress);
    }

    @Transactional
    public IssuedTokens issue(String correo, String userAgent, String ipAddress) {
        return issue(correo, UUID.randomUUID(), userAgent, ipAddress);
    }

    private IssuedTokens issue(String correo, UUID tokenFamilyId, String userAgent, String ipAddress) {
        var user = userRepository.findFirstByCorreoOrderByIdAsc(correo.toLowerCase(java.util.Locale.ROOT))
                .orElseThrow(this::invalidToken);
        return issue(user, tokenFamilyId, userAgent, ipAddress);
    }

    private IssuedTokens issue(com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity user,
                               UUID tokenFamilyId, String userAgent, String ipAddress) {
        UserDetails details = userDetailsService.loadUserById(user.getId());
        String refreshToken = randomToken();
        String csrfToken = randomToken();
        UserTokenEntity entity = new UserTokenEntity();
        entity.setUserId(user.getId());
        entity.setType(UserTokenType.REFRESH_TOKEN);
        entity.setTokenHash(hash(refreshToken));
        entity.setCsrfTokenHash(hash(csrfToken));
        entity.setTokenFamilyId(tokenFamilyId);
        entity.setExpiresAt(LocalDateTime.now().plusSeconds(expirationSeconds));
        entity.setUserAgent(truncate(userAgent, 255));
        entity.setIpAddress(truncate(ipAddress, 64));
        tokenRepository.save(entity);
        return new IssuedTokens(jwtService.generateToken(details, tokenFamilyId), refreshToken, csrfToken);
    }

    @Transactional
    public IssuedTokens rotate(String refreshToken, String csrfToken) {
        UserTokenEntity current = tokenRepository
                .findByTokenHashAndType(hash(refreshToken), UserTokenType.REFRESH_TOKEN)
                .orElseThrow(this::invalidToken);
        LocalDateTime now = LocalDateTime.now();
        validateCsrf(current, csrfToken);
        if (current.getRevokedAt() != null
                || current.getUsedAt() != null
                || !current.getExpiresAt().isAfter(now)) {
            detectReuse(current, now);
            throw invalidToken();
        }
        UUID tokenFamilyId = current.getTokenFamilyId() == null
                ? UUID.randomUUID()
                : current.getTokenFamilyId();
        current.setTokenFamilyId(tokenFamilyId);
        current.setUsedAt(now);
        current.setLastUsedAt(now);
        tokenRepository.save(current);
        var user = userRepository.findById(current.getUserId()).orElseThrow(this::invalidToken);
        return issue(user, tokenFamilyId, current.getUserAgent(), current.getIpAddress());
    }

    @Transactional
    public IssuedTokens rotate(String refreshToken) {
        return rotate(refreshToken, null);
    }

    @Transactional
    public void revoke(String refreshToken) {
        revoke(refreshToken, null);
    }

    @Transactional
    public void revoke(String refreshToken, String csrfToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        tokenRepository.findByTokenHashAndType(hash(refreshToken), UserTokenType.REFRESH_TOKEN)
                .ifPresent(token -> {
                    validateCsrf(token, csrfToken);
                    LocalDateTime now = LocalDateTime.now();
                    token.setRevokedAt(now);
                    token.setLastUsedAt(now);
                    tokenRepository.save(token);
                    if (token.getTokenFamilyId() != null) {
                        tokenRepository.revokeFamily(token.getTokenFamilyId(), UserTokenType.REFRESH_TOKEN, now);
                    }
                });
    }

    public boolean isFamilyActive(UUID tokenFamilyId) {
        return tokenFamilyId != null
                && tokenRepository.existsByTokenFamilyIdAndTypeAndRevokedAtIsNullAndUsedAtIsNullAndExpiresAtAfter(
                tokenFamilyId, UserTokenType.REFRESH_TOKEN, LocalDateTime.now());
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no disponible", exception);
        }
    }

    private void detectReuse(UserTokenEntity token, LocalDateTime now) {
        if (token.getTokenFamilyId() == null) return;
        if (token.getUsedAt() != null
                && !token.getUsedAt().plusSeconds(reuseGraceSeconds).isBefore(now)) {
            return;
        }
        tokenRepository.revokeFamily(token.getTokenFamilyId(), UserTokenType.REFRESH_TOKEN, now);
    }

    private void validateCsrf(UserTokenEntity token, String csrfToken) {
        if (token.getCsrfTokenHash() == null) return;
        if (csrfToken == null || csrfToken.isBlank()
                || !MessageDigest.isEqual(
                token.getCsrfTokenHash().getBytes(StandardCharsets.UTF_8),
                hash(csrfToken).getBytes(StandardCharsets.UTF_8))) {
            throw new DomainException(
                    UserErrorCode.INVALID_CREDENTIALS.getField(),
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "CSRF token inválido");
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private DomainException invalidToken() {
        return new DomainException(UserErrorCode.INVALID_CREDENTIALS.getField(),
                UserErrorCode.INVALID_CREDENTIALS.getStatus(), "Refresh token inválido o expirado");
    }

    public record IssuedTokens(String accessToken, String refreshToken, String csrfToken) {
        public IssuedTokens(String accessToken, String refreshToken) {
            this(accessToken, refreshToken, null);
        }
    }
}
