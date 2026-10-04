package com.tesoreria.user.application.usecase;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.user.core.constant.RoleEnum;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import com.tesoreria.organization.application.OrganizationEmailBrandingService;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.UserTokenType;
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
    private final ApoderadoJpaRepository guardians;
    private final OrganizationJpaRepository organizations;

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
            OrganizationEmailBrandingService emailBranding,
            ApoderadoJpaRepository guardians, OrganizationJpaRepository organizations) {
        this.users = users;
        this.tokens = tokens;
        this.email = email;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.revocationService = revocationService;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.currentOrganization = currentOrganization;
        this.emailBranding = emailBranding;
        this.guardians = guardians;
        this.organizations = organizations;
    }

    public AccountRecoveryService(UserRepositoryOutPort users, UserTokenJpaRepository tokens,
            EmailOutPort email, PasswordEncoder passwordEncoder, AuthFlowRateLimiter rateLimiter,
            TokenRevocationService revocationService, String frontendUrl,
            CurrentOrganizationService currentOrganization, OrganizationEmailBrandingService emailBranding,
            ApoderadoJpaRepository guardians) {
        this(users, tokens, email, passwordEncoder, rateLimiter, revocationService,
                frontendUrl, currentOrganization, emailBranding, guardians, null);
    }

    public AccountRecoveryService(UserRepositoryOutPort users, UserTokenJpaRepository tokens,
            EmailOutPort email, PasswordEncoder passwordEncoder, AuthFlowRateLimiter rateLimiter,
            TokenRevocationService revocationService, String frontendUrl,
            CurrentOrganizationService currentOrganization, OrganizationEmailBrandingService emailBranding) {
        this(users, tokens, email, passwordEncoder, rateLimiter, revocationService,
                frontendUrl, currentOrganization, emailBranding, null, null);
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
        // Defense retained even though no registration can create an account.
        requireCourseMembership(user);
        throw new DomainException("registration", org.springframework.http.HttpStatus.FORBIDDEN,
                "El acceso se habilita exclusivamente mediante una invitación administrativa.");
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public User inviteGuardian(Long guardianId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getAuthorities().stream().noneMatch(a ->
                        "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_SUPER_ADMIN".equals(a.getAuthority()))
                || !(authentication.getPrincipal() instanceof TenantUserDetails principal)
                || principal.getOrganizationId() == null) {
            throw invitationDenied("La invitación requiere una sesión ADMIN o SUPER_ADMIN con un curso asignado.");
        }
        Long organizationId = principal.getOrganizationId();
        User actor = users.findById(principal.getUserId()).orElseThrow(() ->
                invitationDenied("La cuenta de la sesión ya no existe. Inicie sesión nuevamente."));
        if (actor.getRol() != RoleEnum.ADMIN && actor.getRol() != RoleEnum.SUPER_ADMIN) {
            throw invitationDenied("Esta sesión corresponde al rol " + actor.getRol()
                    + ". La invitación requiere una cuenta ADMIN o SUPER_ADMIN.");
        }
        if (!organizationId.equals(actor.getOrganizationId())) {
            throw invitationDenied("El curso de la sesión no coincide con el curso del administrador. "
                    + "Inicie sesión nuevamente en el curso correspondiente.");
        }
        if (!Boolean.TRUE.equals(actor.getEnabled())) {
            throw invitationDenied("La cuenta del administrador está deshabilitada.");
        }
        if (!Boolean.TRUE.equals(actor.getAccountNonLocked())) {
            throw invitationDenied("La cuenta del administrador está bloqueada.");
        }
        requireActiveCourse(organizationId);
        ApoderadoEntity guardian = guardians.lockInOrganization(guardianId, organizationId)
                .filter(ApoderadoEntity::isActivo).orElseThrow(() -> invitationDenied(
                        "El apoderado debe estar activo y registrado en el curso de la sesión."));
        String normalized = normalize(guardian.getEmail());
        User user = users.findByCorreoAndOrganizationId(normalized, organizationId).orElseGet(() -> {
            String temporaryPassword = "Tmp!" + UUID.randomUUID() + "aA1";
            User invited = new User(null,
                    "USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                    guardian.getNombre(), normalized, temporaryPassword, RoleEnum.USER,
                    false, true, null, LocalDateTime.now(), LocalDateTime.now());
            invited.setPassword(passwordEncoder.encode(temporaryPassword));
            invited.setOrganizationId(organizationId);
            invited.setInvitedGuardianId(guardianId);
            return users.save(invited);
        });
        requireCourseMembership(user);
        if (user.getRol() != RoleEnum.USER) {
            throw invitationDenied("El correo ya corresponde a una cuenta administrativa en este curso.");
        }
        if (user.getInvitedGuardianId() != null && !guardianId.equals(user.getInvitedGuardianId())) {
            throw invitationDenied("La cuenta de este curso está vinculada a otro registro de apoderado. "
                    + "Revise el vínculo antes de emitir una nueva invitación.");
        }
        if (Boolean.TRUE.equals(user.getEnabled()) && user.getInvitationAcceptedAt() != null) {
            return user;
        }
        user.setInvitedGuardianId(guardianId);
        user.setEnabled(false);
        user = users.save(user);
        String rawToken = issue(user.getId(), UserTokenType.ACCOUNT_INVITATION, 24 * 60, true, guardian);
        requireDelivery(sendPasswordReset(user,
                frontendUrl + "/aceptar-invitacion?token=" + rawToken));
        return user;
    }

    @Transactional
    public User verifyEmail(String rawToken) {
        UserTokenEntity token = validToken(rawToken, UserTokenType.EMAIL_VERIFICATION);
        User user = users.findById(token.getUserId()).orElseThrow(this::invalidToken);
        requireCourseMembership(user);
        requireActiveCourse(user.getOrganizationId());
        if (user.getRol() == RoleEnum.USER && user.getInvitationAcceptedAt() == null) {
            throw membershipDenied();
        }
        user.setEmailVerifiedAt(LocalDateTime.now());
        // Email verification proves mailbox control only, never course authorization.
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
                .filter(user -> user.getEmailVerifiedAt() == null && user.getInvitationAcceptedAt() != null)
                .ifPresent(user -> {
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
        findForPublicEmailFlow(normalized, organizationId)
                .filter(user -> user.getRol() != RoleEnum.USER || Boolean.TRUE.equals(user.getEnabled()))
                .ifPresent(user -> {
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
        if (token.getType() == UserTokenType.ACCOUNT_INVITATION) {
            requireInvitationMembership(token, user);
        } else if (user.getRol() == RoleEnum.USER && !Boolean.TRUE.equals(user.getEnabled())) {
            throw membershipDenied();
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new DomainException(UserErrorCode.PASSWORD_INVALID.getField(),
                    UserErrorCode.PASSWORD_INVALID.getStatus(), "La nueva contraseña debe ser diferente");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        if (token.getType() == UserTokenType.ACCOUNT_INVITATION) {
            user.setEmailVerifiedAt(LocalDateTime.now());
            user.setInvitationAcceptedAt(LocalDateTime.now());
            user.setEnabled(true);
            user.setAccountNonLocked(true);
        }
        users.save(user);
        token.setUsedAt(LocalDateTime.now());
        tokens.save(token);
        tokens.markAllUsed(token.getUserId(), token.getType(), token.getUsedAt());
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

    private void requireActiveCourse(Long organizationId) {
        if (organizations == null || organizationId == null) {
            throw invitationDenied("La cuenta debe tener un curso asignado.");
        }
        var organization = organizations.findById(organizationId).orElseThrow(() ->
                invitationDenied("El curso asignado a la cuenta ya no existe."));
        if (!organization.isActive()) {
            throw invitationDenied("El curso está inactivo. Active el curso antes de habilitar el acceso.");
        }
        if (organization.getType() != OrganizationType.COURSE
                && !(organization.getType() == OrganizationType.LEGACY
                && "default".equals(organization.getSlug()))) {
            throw invitationDenied("La organización debe ser de tipo COURSE para habilitar acceso de apoderados.");
        }
    }

    private void requireInvitationMembership(UserTokenEntity token, User user) {
        requireCourseMembership(user);
        requireActiveCourse(user.getOrganizationId());
        if (token.getGuardianId() == null
                || !token.getGuardianId().equals(user.getInvitedGuardianId())
                || !user.getOrganizationId().equals(token.getInvitationOrganizationId())
                || !normalize(user.getCorreo()).equals(token.getInvitationEmail())
                || user.getRol() != RoleEnum.USER
                || !Boolean.TRUE.equals(user.getAccountNonLocked())) throw membershipDenied();
        ApoderadoEntity guardian = guardians.lockInOrganization(token.getGuardianId(),
                token.getInvitationOrganizationId()).orElseThrow(this::membershipDenied);
        if (!guardian.isActivo() || !normalize(guardian.getEmail()).equals(token.getInvitationEmail())) {
            throw membershipDenied();
        }
    }

    private DomainException membershipDenied() {
        return new DomainException("membership", org.springframework.http.HttpStatus.FORBIDDEN,
                "El acceso requiere una invitación administrativa y pertenencia vigente al curso.");
    }

    private DomainException invitationDenied(String message) {
        return new DomainException("membership", org.springframework.http.HttpStatus.FORBIDDEN, message);
    }

    private void requireCourseMembership(User user) {
        if (user.getOrganizationId() == null || guardians == null
                || !guardians.existsActiveMember(normalize(user.getCorreo()), user.getOrganizationId())) {
            throw new DomainException("membership", org.springframework.http.HttpStatus.FORBIDDEN,
                    "El acceso requiere un apoderado activo registrado en el curso. Contacte a la administración.");
        }
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
        return issue(userId, type, minutes, replaceExisting, null);
    }

    private String issue(Long userId, UserTokenType type, long minutes, boolean replaceExisting,
                         ApoderadoEntity guardian) {
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
        if (guardian != null) {
            token.setGuardianId(guardian.getApoderadoId());
            token.setInvitationOrganizationId(guardian.getOrganizationId());
            token.setInvitationEmail(normalize(guardian.getEmail()));
        }
        tokens.save(token);
        return raw;
    }

    private UserTokenEntity validToken(String rawToken, UserTokenType type) {
        if (rawToken == null || rawToken.isBlank()) throw invalidToken();
        UserTokenEntity token = tokens.findByTokenHashAndType(hash(rawToken), type)
                .orElseThrow(this::invalidToken);
        if (token.getUsedAt() != null || token.getRevokedAt() != null) throw invalidToken();
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
        if (token.getUsedAt() != null || token.getRevokedAt() != null) throw invalidToken();
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
