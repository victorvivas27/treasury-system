package com.tesoreria.messaging.application;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.messaging.config.WhatsAppProperties;
import com.tesoreria.messaging.core.InvitationMessagePort;
import com.tesoreria.messaging.core.PhoneNumber;
import com.tesoreria.messaging.infrastructure.GuardianInvitationEntity;
import com.tesoreria.messaging.infrastructure.GuardianInvitationRepository;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.Arrays;

@Service
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class GuardianWhatsAppService {
    private static final String PENDING = "PENDING";
    private static final String TEST = "test";
    private static final String PRODUCTION = "production";
    private static final String MOCK = "mock";
    private static final String META = "meta";
    private static final String HTTPS = "https";
    private static final long MAX_INVITATION_HOURS = 168;

    private final AccountRecoveryService recovery;
    private final GuardianInvitationRepository invitations;
    private final ApoderadoJpaRepository guardians;
    private final CurrentOrganizationService organization;
    private final WhatsAppProperties config;
    private final InvitationMessagePort messaging;
    private final UserTokenJpaRepository tokens;
    private final UserRepositoryOutPort users;

    public GuardianWhatsAppService(AccountRecoveryService recovery, GuardianInvitationRepository invitations,
            ApoderadoJpaRepository guardians, CurrentOrganizationService organization, WhatsAppProperties config,
            InvitationMessagePort messaging, UserTokenJpaRepository tokens, UserRepositoryOutPort users) {
        this.recovery = recovery;
        this.invitations = invitations;
        this.guardians = guardians;
        this.organization = organization;
        this.config = config;
        this.messaging = messaging;
        this.tokens = tokens;
        this.users = users;
    }

    @Transactional
    public InvitationStatus invite(Long guardianId, Consent consent) {
        Long tenant = organization.getId();
        var guardian = guardians.lockInOrganization(guardianId, tenant).orElseThrow(() ->
                problem(HttpStatus.NOT_FOUND, "Apoderado no encontrado."));
        String phone = PhoneNumber.normalize(guardian.getTelefono());
        validateConsent(consent);
        validateConfiguration(phone);
        var previous = invitations.findFirstByGuardianIdAndOrganizationIdOrderByIdDesc(guardianId, tenant);
        if (previous.filter(value -> value.getCreatedAt().plusMinutes(1).isAfter(LocalDateTime.now())).isPresent()) {
            throw problem(HttpStatus.TOO_MANY_REQUESTS, "Espera un minuto antes de reenviar la invitacion.");
        }
        GuardianInvitationEntity[] created = new GuardianInvitationEntity[1];
        recovery.inviteGuardian(guardianId, issued -> {
            var invitation = new GuardianInvitationEntity();
            invitation.setOrganizationId(tenant);
            invitation.setGuardianId(guardianId);
            invitation.setUserId(issued.user().getId());
            invitation.setTokenHash(issued.tokenHash());
            invitation.setPhone(phone);
            invitation.setConsentSource(consent.source().trim());
            invitation.setConsentAt(consent.authorizedAt());
            var principal = (TenantUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            invitation.setConsentRecordedBy(principal.getUserId());
            invitation.setCreatedAt(LocalDateTime.now());
            invitation.setExpiresAt(invitation.getCreatedAt().plusHours(config.getInvitationHours()));
            invitation.setDeliveryStatus(PENDING);
            invitations.save(invitation);
            invitation.setDeliveryStatus("SEND_REQUESTED");
            invitation.setRequestedAt(LocalDateTime.now());
            var result = messaging.sendInvitation(phone, guardian.getNombre(), "Tesoreria Escolar", issued.rawToken());
            invitation.setDeliveryStatus(result.accepted() ? (result.simulated() ? "SIMULATED" : "ACCEPTED") : "FAILED");
            if (result.accepted()) invitation.setAcceptedAt(LocalDateTime.now());
            invitation.setSimulated(result.simulated());
            invitation.setMessageId(result.messageId());
            invitation.setErrorCode(result.errorCode());
            created[0] = invitations.save(invitation);
        }, config.getInvitationHours() * 60);
        if (created[0] == null) throw problem(HttpStatus.CONFLICT, "La cuenta ya esta activada.");
        return status(created[0]);
    }

    @Transactional
    public InvitationStatus latest(Long guardianId) {
        return invitations.findFirstByGuardianIdAndOrganizationIdOrderByIdDesc(guardianId, organization.getId())
                .map(this::status).orElse(new InvitationStatus("NONE", null, null, null, null, null, null, false));
    }

    private InvitationStatus status(GuardianInvitationEntity invitation) {
        var user = users.findById(invitation.getUserId()).orElse(null);
        LocalDateTime activated = user == null ? null : user.getInvitationAcceptedAt();
        String state = activated != null ? "ACTIVATED" : invitation.getExpiresAt().isBefore(LocalDateTime.now()) ? "EXPIRED" : PENDING;
        if (PENDING.equals(state) && tokens.findByTokenHashAndType(invitation.getTokenHash(), UserTokenType.ACCOUNT_INVITATION)
                .filter(token -> token.getUsedAt() == null && token.getRevokedAt() == null).isEmpty()) state = "SUPERSEDED";
        return new InvitationStatus(state, invitation.getDeliveryStatus(), invitation.getCreatedAt(), invitation.getExpiresAt(),
                activated, invitation.getDeliveredAt(), invitation.getErrorCode(), invitation.isSimulated());
    }

    private void validateConsent(Consent consent) {
        if (consent == null || !consent.authorized() || consent.source() == null || consent.source().isBlank()
                || consent.source().length() > 200 || consent.authorizedAt() == null
                || consent.authorizedAt().isAfter(LocalDateTime.now())) {
            throw problem(HttpStatus.BAD_REQUEST, "Registra la fuente y fecha de autorizacion para WhatsApp.");
        }
    }

    private void validateConfiguration(String phone) {
        if (!config.isEnabled()) throw problem(HttpStatus.SERVICE_UNAVAILABLE, "Las invitaciones por WhatsApp estan deshabilitadas.");
        URI url;
        try { url = URI.create(config.getPublicUrl()); }
        catch (IllegalArgumentException exception) {
            var error = problem(HttpStatus.SERVICE_UNAVAILABLE, "APP_PUBLIC_URL no valida.");
            error.initCause(exception);
            throw error;
        }
        if (!HTTPS.equals(url.getScheme()) || url.getHost() == null || url.getRawQuery() != null
                || url.getRawFragment() != null || url.getUserInfo() != null || config.getInvitationHours() < 1
                || config.getInvitationHours() > MAX_INVITATION_HOURS || !(TEST.equals(config.getMode()) || PRODUCTION.equals(config.getMode()))) {
            throw problem(HttpStatus.SERVICE_UNAVAILABLE, "Configura HTTPS, modo y expiracion de WhatsApp.");
        }
        if (MOCK.equals(config.getProvider()) && TEST.equals(config.getMode())) return;
        if (!META.equals(config.getProvider()) || config.getAccessToken().isBlank()
                || !config.getPhoneNumberId().matches("[0-9]+") || config.getBusinessAccountId().isBlank()
                || !config.getApiVersion().matches("v[0-9]+\\.[0-9]+") || config.getTemplateInvitation().isBlank()) {
            throw problem(HttpStatus.SERVICE_UNAVAILABLE, "Configuracion de Meta incompleta.");
        }
        if (TEST.equals(config.getMode()) && Arrays.stream(config.getTestRecipients().split(","))
                .map(String::trim).noneMatch(phone::equals)) {
            throw problem(HttpStatus.BAD_REQUEST, "El destinatario no esta autorizado para Meta Test Number.");
        }
    }

    private DomainException problem(HttpStatus status, String message) { return new DomainException("whatsapp", status, message); }

    public record Consent(boolean authorized, String source, LocalDateTime authorizedAt) { }
    public record InvitationStatus(String status, String deliveryStatus, LocalDateTime createdAt, LocalDateTime expiresAt,
            LocalDateTime activatedAt, LocalDateTime deliveredAt, String errorCode, boolean simulated) { }
}
