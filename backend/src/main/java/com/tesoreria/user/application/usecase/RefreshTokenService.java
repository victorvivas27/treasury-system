package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class RefreshTokenService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserTokenJpaRepository tokenRepository;
    private final UserJpaRepository userRepository;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final long expirationSeconds;

    public RefreshTokenService(UserTokenJpaRepository tokenRepository, UserJpaRepository userRepository,
            CustomUserDetailsService userDetailsService, JwtService jwtService,
            @Value("${app.refresh-token.expiration-seconds:2592000}") long expirationSeconds) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.expirationSeconds = expirationSeconds;
    }

    @Transactional
    public IssuedTokens issue(String correo) {
        var user = userRepository.findByCorreo(correo.toLowerCase(java.util.Locale.ROOT))
                .orElseThrow(this::invalidToken);
        UserDetails details = userDetailsService.loadUserByUsername(user.getCorreo());
        String refreshToken = randomToken();
        UserTokenEntity entity = new UserTokenEntity();
        entity.setUserId(user.getId());
        entity.setType(UserTokenType.REFRESH_TOKEN);
        entity.setTokenHash(hash(refreshToken));
        entity.setExpiresAt(LocalDateTime.now().plusSeconds(expirationSeconds));
        tokenRepository.save(entity);
        return new IssuedTokens(jwtService.generateToken(details), refreshToken);
    }

    @Transactional
    public IssuedTokens rotate(String refreshToken) {
        UserTokenEntity current = tokenRepository
                .findByTokenHashAndType(hash(refreshToken), UserTokenType.REFRESH_TOKEN)
                .orElseThrow(this::invalidToken);
        if (current.getUsedAt() != null || !current.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw invalidToken();
        }
        current.setUsedAt(LocalDateTime.now());
        tokenRepository.save(current);
        var user = userRepository.findById(current.getUserId()).orElseThrow(this::invalidToken);
        return issue(user.getCorreo());
    }

    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        tokenRepository.findByTokenHashAndType(hash(refreshToken), UserTokenType.REFRESH_TOKEN)
                .ifPresent(token -> {
                    token.setUsedAt(LocalDateTime.now());
                    tokenRepository.save(token);
                });
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

    private DomainException invalidToken() {
        return new DomainException(UserErrorCode.INVALID_CREDENTIALS.getField(),
                UserErrorCode.INVALID_CREDENTIALS.getStatus(), "Refresh token inválido o expirado");
    }

    public record IssuedTokens(String accessToken, String refreshToken) { }
}
