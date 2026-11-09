package com.tesoreria.user.application.usecase;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.user.core.model.InvitationEmailAccepted;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.GuardianEmailDeliveryEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.GuardianEmailDeliveryRepository;
import org.springframework.context.event.EventListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.Map;

@Service
public class InvitationDeliveryService {
    private static final String SENT = "SENT";
    private static final Map<String, String> STATES = Map.of(
            "email.sent", SENT, "email.delivered", "DELIVERED", "email.delivery_delayed", "DELAYED",
            "email.bounced", "BOUNCED", "email.failed", "FAILED", "email.suppressed", "FAILED",
            "email.complained", "COMPLAINED");
    private final GuardianEmailDeliveryRepository deliveries;
    private final ApoderadoService guardians;
    private final CurrentOrganizationService organization;
    private final boolean trackingEnabled;

    public InvitationDeliveryService(GuardianEmailDeliveryRepository deliveries, ApoderadoService guardians,
                                      CurrentOrganizationService organization,
                                      @Value("${app.email.resend.webhook-secret:}") String webhookSecret) {
        this.deliveries = deliveries;
        this.guardians = guardians;
        this.organization = organization;
        this.trackingEnabled = !webhookSecret.isBlank();
    }

    @EventListener
    @Transactional
    public void accepted(InvitationEmailAccepted event) {
        var guardian = guardians.findByEmail(event.recipient());
        var delivery = new GuardianEmailDeliveryEntity();
        delivery.setOrganizationId(organization.getId());
        delivery.setGuardianId(guardian.getApoderadoId());
        delivery.setMessageId(event.messageId());
        delivery.setStatus(SENT);
        delivery.setCreatedAt(Instant.now());
        deliveries.save(delivery);
    }

    public record Status(String status, Instant createdAt, Instant updatedAt, boolean trackingEnabled) { }

    @Transactional(readOnly = true)
    public Status latest(String codigo) {
        var guardian = guardians.findByCodigo(codigo);
        return deliveries.findFirstByOrganizationIdAndGuardianIdOrderByIdDesc(organization.getId(), guardian.getApoderadoId())
                .map(d -> new Status(d.getStatus(), d.getCreatedAt(), d.getEventAt(), trackingEnabled))
                .orElseGet(() -> new Status("UNTRACKED", null, null, trackingEnabled));
    }

    @Transactional
    public void receive(String messageId, String event, Instant eventAt, boolean invitation) {
        String next = STATES.get(event);
        if (next == null) return;
        var delivery = deliveries.findByMessageId(messageId);
        if (delivery.isEmpty()) {
            // An early callback may arrive before the invitation transaction commits. Request a retry.
            if (invitation) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
            return;
        }
        var row = delivery.get();
        if (row.getEventAt() != null && !eventAt.isAfter(row.getEventAt())) return;
        // Late sent/delayed events never undo a delivery or permanent rejection.
        if (!java.util.Set.of(SENT, "DELAYED").contains(row.getStatus())
                && java.util.Set.of(SENT, "DELAYED").contains(next)) return;
        row.setStatus(next);
        row.setEventAt(eventAt);
        deliveries.save(row);
    }
}
