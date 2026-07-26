package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.exception.EmailAlreadyExistsException;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.EmailOutPort;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class AccountRecoveryService {
    private static final String GENERIC_VERIFICATION =
            "Si el correo corresponde a una cuenta pendiente, recibirás un nuevo enlace de verificación.";
    private static final String GENERIC_RESET =
            "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.";
    private final UserRepositoryOutPort users;
    private final UserTokenJpaRepository tokens;
    private final EmailOutPort email;
    private final PasswordEncoder passwordEncoder;
    private final AuthFlowRateLimiter rateLimiter;
    private final TokenRevocationService revocationService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String frontendUrl;

    public AccountRecoveryService(
            UserRepositoryOutPort users,
            UserTokenJpaRepository tokens,
            EmailOutPort email,
            PasswordEncoder passwordEncoder,
            AuthFlowRateLimiter rateLimiter,
            TokenRevocationService revocationService,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.users = users;
        this.tokens = tokens;
        this.email = email;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.revocationService = revocationService;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Transactional
    public User register(User user) {
        if (users.existsByCorreo(user.getCorreo())) throw new EmailAlreadyExistsException(user.getCorreo());
        User.validateRawPassword(user.getPassword());
        if (user.getCode() == null) {
            user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEnabled(false);
        User saved = users.save(user);
        String rawToken = issue(saved.getId(), UserTokenType.EMAIL_VERIFICATION, 24 * 60);
        requireDelivery(email.sendVerificationEmail(saved.getCorreo(), saved.getNombre(),
                frontendUrl + "/verificar-correo?token=" + rawToken));
        return saved;
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        UserTokenEntity token = validToken(rawToken, UserTokenType.EMAIL_VERIFICATION);
        User user = users.findById(token.getUserId()).orElseThrow(this::invalidToken);
        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setEnabled(true);
        users.save(user);
        token.setUsedAt(LocalDateTime.now());
        tokens.save(token);
    }

    @Transactional
    public String resendVerification(String address) {
        String normalized = normalize(address);
        rateLimiter.checkAndRecord("verification", normalized);
        users.findByCorreo(normalized).filter(user -> user.getEmailVerifiedAt() == null).ifPresent(user -> {
            String rawToken = issue(user.getId(), UserTokenType.EMAIL_VERIFICATION, 24 * 60);
            requireDelivery(email.sendVerificationEmail(user.getCorreo(), user.getNombre(),
                    frontendUrl + "/verificar-correo?token=" + rawToken));
        });
        return GENERIC_VERIFICATION;
    }

    @Transactional
    public String forgotPassword(String address) {
        String normalized = normalize(address);
        rateLimiter.checkAndRecord("password-reset", normalized);
        users.findByCorreo(normalized).ifPresent(user -> {
            String rawToken = issue(user.getId(), UserTokenType.PASSWORD_RESET, 60);
            requireDelivery(email.sendPasswordResetEmail(user.getCorreo(), user.getNombre(),
                    frontendUrl + "/restablecer-password?token=" + rawToken));
        });
        return GENERIC_RESET;
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        User.validateRawPassword(newPassword);
        UserTokenEntity token = validToken(rawToken, UserTokenType.PASSWORD_RESET);
        User user = users.findById(token.getUserId()).orElseThrow(this::invalidToken);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.PASSWORD_INVALID.getField(),
                    UserErrorCode.PASSWORD_INVALID.getStatus(), "La nueva contraseña debe ser diferente");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        users.save(user);
        token.setUsedAt(LocalDateTime.now());
        tokens.save(token);
        revocationService.revokeAllForUser(user.getCorreo());
        requireDelivery(email.sendPasswordChangedEmail(user.getCorreo(), user.getNombre(), LocalDateTime.now()));
    }

    @Transactional
    public void changePassword(String address, String currentPassword, String newPassword) {
        User user = users.findByCorreo(normalize(address)).orElseThrow(this::invalidToken);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.INVALID_CREDENTIALS.getField(),
                    UserErrorCode.INVALID_CREDENTIALS.getStatus(), "La contraseña actual no es correcta");
        }
        User.validateRawPassword(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.PASSWORD_INVALID.getField(),
                    UserErrorCode.PASSWORD_INVALID.getStatus(), "La nueva contraseña debe ser diferente");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        users.save(user);
        revocationService.revokeAllForUser(user.getCorreo());
        requireDelivery(email.sendPasswordChangedEmail(user.getCorreo(), user.getNombre(), LocalDateTime.now()));
    }

    private String issue(Long userId, UserTokenType type, long minutes) {
        tokens.deleteActiveByUserIdAndType(userId, type);
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(userId);
        token.setType(type);
        token.setTokenHash(hash(raw));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(minutes));
        tokens.save(token);
        return raw;
    }

    private UserTokenEntity validToken(String rawToken, UserTokenType type) {
        if (rawToken == null || rawToken.isBlank()) throw invalidToken();
        UserTokenEntity token = tokens.findByTokenHashAndType(hash(rawToken), type)
                .orElseThrow(this::invalidToken);
        if (token.getUsedAt() != null) throw invalidToken();
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new DomainException(UserErrorCode.TOKEN_EXPIRED.getField(),
                    UserErrorCode.TOKEN_EXPIRED.getStatus(), "El enlace ha vencido");
        }
        return token;
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no disponible", exception);
        }
    }

    private String normalize(String emailAddress) {
        return emailAddress == null ? "" : emailAddress.trim().toLowerCase(Locale.ROOT);
    }

    private DomainException invalidToken() {
        return new DomainException(UserErrorCode.TOKEN_INVALID.getField(),
                UserErrorCode.TOKEN_INVALID.getStatus(), "El enlace no es válido o ya fue utilizado");
    }

    private void requireDelivery(boolean delivered) {
        if (!delivered) throw new DomainException(UserErrorCode.EMAIL_DELIVERY.getField(),
                UserErrorCode.EMAIL_DELIVERY.getStatus(), "No fue posible enviar el correo. Intenta nuevamente.");
    }
}
