package com.tesoreria.user.application.usecase;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.application.OrganizationEmailBrandingService;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
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
    private final CurrentOrganizationService currentOrganization;
    private final OrganizationEmailBrandingService emailBranding;

    @Autowired
    public AccountRecoveryService(
            UserRepositoryOutPort users,
            UserTokenJpaRepository tokens,
            EmailOutPort email,
            PasswordEncoder passwordEncoder,
            AuthFlowRateLimiter rateLimiter,
            TokenRevocationService revocationService,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
            CurrentOrganizationService currentOrganization,
            OrganizationEmailBrandingService emailBranding) {
        this.users = users;
        this.tokens = tokens;
        this.email = email;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.revocationService = revocationService;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.currentOrganization = currentOrganization;
        this.emailBranding = emailBranding;
    }

    public AccountRecoveryService(
            UserRepositoryOutPort users,
            UserTokenJpaRepository tokens,
            EmailOutPort email,
            PasswordEncoder passwordEncoder,
            AuthFlowRateLimiter rateLimiter,
            TokenRevocationService revocationService,
            String frontendUrl) {
        this(users, tokens, email, passwordEncoder, rateLimiter, revocationService,
                frontendUrl, null, null);
    }

    @Transactional
    public User register(User user) {
        Long organizationId = currentOrganization == null ? null : currentOrganization.getId();
        user.setOrganizationId(organizationId);
        if (users.existsByCorreoAndOrganizationId(user.getCorreo(), organizationId)) {
            throw new EmailAlreadyExistsException(user.getCorreo());
        }
        User.validateRawPassword(user.getPassword());
        if (user.getCode() == null) {
            user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEnabled(false);
        User saved = users.save(user);
        String rawToken = issue(saved.getId(), UserTokenType.EMAIL_VERIFICATION, 24 * 60, true);
        requireDelivery(sendVerification(saved,
                frontendUrl + "/verificar-correo?token=" + rawToken));
        return saved;
    }

    @Transactional
    public User inviteGuardian(String name, String address) {
        String normalized = normalize(address);
        Long organizationId = currentOrganization == null ? null : currentOrganization.getId();
        User user = users.findByCorreoAndOrganizationId(normalized, organizationId).orElseGet(() -> {
            String temporaryPassword = "Tmp!" + UUID.randomUUID() + "aA1";
            User invited = new User(null,
                    "USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                    name, normalized, temporaryPassword,
                    com.tesoreria.user.core.constant.RoleEnum.USER,
                    false, true, null, LocalDateTime.now(), LocalDateTime.now());
            invited.setPassword(passwordEncoder.encode(temporaryPassword));
            invited.setOrganizationId(organizationId);
            return users.save(invited);
        });

        if (organizationId != null && user.getOrganizationId() == null) {
            user.setOrganizationId(organizationId);
            user = users.save(user);
        }
        if (Boolean.TRUE.equals(user.getEnabled()) && user.getEmailVerifiedAt() != null) {
            return user;
        }
        String rawToken = issue(user.getId(), UserTokenType.ACCOUNT_INVITATION, 24 * 60, true);
        requireDelivery(sendPasswordReset(user,
                frontendUrl + "/restablecer-password?token=" + rawToken));
        return user;
    }

    @Transactional
    public User verifyEmail(String rawToken) {
        UserTokenEntity token = validToken(rawToken, UserTokenType.EMAIL_VERIFICATION);
        User user = users.findById(token.getUserId()).orElseThrow(this::invalidToken);
        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setEnabled(true);
        users.save(user);
        tokens.delete(token);
        return user;
    }

    @Transactional
    public String resendVerification(String address) {
        return resendVerification(address, currentOrganization == null ? null : currentOrganization.getId());
    }

    @Transactional
    public String resendVerification(String address, Long organizationId) {
        String normalized = normalize(address);
        rateLimiter.checkAndRecord("verification", normalized);
        findForPublicEmailFlow(normalized, organizationId)
                .filter(user -> user.getEmailVerifiedAt() == null).ifPresent(user -> {
            String rawToken = issue(user.getId(), UserTokenType.EMAIL_VERIFICATION, 24 * 60, true);
            requireDelivery(sendVerification(user,
                    frontendUrl + "/verificar-correo?token=" + rawToken));
        });
        return GENERIC_VERIFICATION;
    }

    @Transactional
    public String forgotPassword(String address) {
        return forgotPassword(address, currentOrganization == null ? null : currentOrganization.getId());
    }

    @Transactional
    public String forgotPassword(String address, Long organizationId) {
        return requestPasswordReset(address, organizationId).message();
    }

    @Transactional
    public PasswordResetRequestResult requestPasswordReset(String address, Long organizationId) {
        String normalized = normalize(address);
        if (organizationId == null) {
            List<User> matches = users.findAllByCorreo(normalized);
            if (matches.size() > 1) {
                return new PasswordResetRequestResult(GENERIC_RESET, true,
                        matches.stream().map(User::getOrganizationId).toList());
            }
        }
        rateLimiter.checkAndRecord("password-reset",
                normalized + (organizationId == null ? "" : ":" + organizationId));
        findForPublicEmailFlow(normalized, organizationId).ifPresent(user -> {
            String rawToken = issue(user.getId(), UserTokenType.PASSWORD_RESET, 60, false);
            requireDelivery(sendPasswordReset(user,
                    frontendUrl + "/restablecer-password?token=" + rawToken));
        });
        return new PasswordResetRequestResult(GENERIC_RESET, false, List.of());
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        User.validateRawPassword(newPassword);
        UserTokenEntity token = validPasswordToken(rawToken);
        User user = users.findById(token.getUserId()).orElseThrow(this::invalidToken);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.PASSWORD_INVALID.getField(),
                    UserErrorCode.PASSWORD_INVALID.getStatus(), "La nueva contraseña debe ser diferente");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        if (token.getType() == UserTokenType.ACCOUNT_INVITATION) {
            user.setEmailVerifiedAt(LocalDateTime.now());
            user.setEnabled(true);
            user.setAccountNonLocked(true);
        }
        users.save(user);
        tokens.deleteByUserIdAndType(token.getUserId(), token.getType());
        revocationService.revokeAllForUser(user.getCorreo());
        requireDelivery(sendPasswordChanged(user, LocalDateTime.now()));
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
        requireDelivery(sendPasswordChanged(user, LocalDateTime.now()));
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = users.findById(userId).orElseThrow(this::invalidToken);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.INVALID_CREDENTIALS.getField(),
                    UserErrorCode.INVALID_CREDENTIALS.getStatus(), "La contraseÃ±a actual no es correcta");
        }
        User.validateRawPassword(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.PASSWORD_INVALID.getField(),
                    UserErrorCode.PASSWORD_INVALID.getStatus(), "La nueva contraseÃ±a debe ser diferente");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        users.save(user);
        revocationService.revokeAllForUser(user.getCorreo());
        requireDelivery(sendPasswordChanged(user, LocalDateTime.now()));
    }

    private boolean sendVerification(User user, String link) {
        if (emailBranding == null) {
            return email.sendVerificationEmail(user.getCorreo(), user.getNombre(), link);
        }
        return email.sendVerificationEmail(user.getCorreo(), user.getNombre(), link,
                emailBranding.find(user.getOrganizationId()));
    }

    private boolean sendPasswordReset(User user, String link) {
        if (emailBranding == null) {
            return email.sendPasswordResetEmail(user.getCorreo(), user.getNombre(), link);
        }
        return email.sendPasswordResetEmail(user.getCorreo(), user.getNombre(), link,
                emailBranding.find(user.getOrganizationId()));
    }

    private boolean sendPasswordChanged(User user, LocalDateTime changedAt) {
        if (emailBranding == null) {
            return email.sendPasswordChangedEmail(user.getCorreo(), user.getNombre(), changedAt);
        }
        return email.sendPasswordChangedEmail(user.getCorreo(), user.getNombre(), changedAt,
                emailBranding.find(user.getOrganizationId()));
    }

    private Optional<User> findForPublicEmailFlow(String emailAddress, Long organizationId) {
        if (organizationId != null) {
            return users.findByCorreoAndOrganizationId(emailAddress, organizationId);
        }
        List<User> matches = users.findAllByCorreo(emailAddress);
        return matches.size() == 1 ? Optional.of(matches.get(0)) : Optional.empty();
    }

    private String issue(Long userId, UserTokenType type, long minutes, boolean replaceExisting) {
        if (replaceExisting) {
            tokens.deleteByUserIdAndType(userId, type);
        }
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

    private UserTokenEntity validPasswordToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) throw invalidToken();
        String tokenHash = hash(rawToken);
        UserTokenEntity token = tokens.findByTokenHashAndType(
                        tokenHash, UserTokenType.PASSWORD_RESET)
                .or(() -> tokens.findByTokenHashAndType(
                        tokenHash, UserTokenType.ACCOUNT_INVITATION))
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

    public record PasswordResetRequestResult(
            String message,
            boolean requiresOrganizationSelection,
            List<Long> organizationIds) {
    }
}
