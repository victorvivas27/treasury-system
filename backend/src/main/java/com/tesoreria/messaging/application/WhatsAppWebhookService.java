package com.tesoreria.messaging.application;

import com.tesoreria.messaging.config.WhatsAppProperties;
import com.tesoreria.messaging.infrastructure.GuardianInvitationRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;

@Service
public class WhatsAppWebhookService {
    private static final String ACCOUNT_OBJECT = "whatsapp_business_account";
    private static final String DELIVERED = "DELIVERED";

    private final WhatsAppProperties config;
    private final GuardianInvitationRepository invitations;
    private final ObjectMapper mapper;
    public WhatsAppWebhookService(WhatsAppProperties config, GuardianInvitationRepository invitations, ObjectMapper mapper) {
        this.config = config;
        this.invitations = invitations;
        this.mapper = mapper;
    }

    public String verify(String mode, String token, String challenge) {
        if (!config.isEnabled() || config.getVerifyToken().isBlank() || !"subscribe".equals(mode)
                || token == null || !MessageDigest.isEqual(config.getVerifyToken().getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8))) throw unauthorized();
        return challenge;
    }

    @Transactional
    public void receive(byte[] body, String signature) {
        if (!config.isEnabled() || config.getAppSecret().isBlank() || signature == null) throw unauthorized();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(config.getAppSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8))) throw unauthorized();
        } catch (GeneralSecurityException exception) { throw new IllegalStateException("HMAC unavailable", exception); }
        JsonNode root = mapper.readTree(body);
        if (!ACCOUNT_OBJECT.equals(root.path("object").asText())) return;
        for (JsonNode entry : root.path("entry")) {
            if (!config.getBusinessAccountId().equals(entry.path("id").asText())) continue;
            for (JsonNode change : entry.path("changes")) {
                JsonNode value = change.path("value");
                if (!config.getPhoneNumberId().equals(value.path("metadata").path("phone_number_id").asText())) continue;
                for (JsonNode status : value.path("statuses")) update(status);
            }
        }
    }

    private void update(JsonNode event) {
        String state = event.path("status").asText();
        if (!("delivered".equals(state) || "read".equals(state) || "failed".equals(state))) return;
        var pending = invitations.findByMessageId(event.path("id").asText());
        long eventTime = event.path("timestamp").asLong(0);
        if (pending.isEmpty() && eventTime > Instant.now().minusSeconds(120).getEpochSecond()) {
            // Meta can notify before the sending transaction commits; ask it to retry.
            throw new DomainException("webhook", HttpStatus.SERVICE_UNAVAILABLE, "Estado pendiente de conciliacion.");
        }
        pending.ifPresent(invitation -> {
            if (invitation.isSimulated() || DELIVERED.equals(invitation.getDeliveryStatus())) return;
            if ("failed".equals(state)) {
                invitation.setDeliveryStatus("FAILED");
                invitation.setErrorCode("META_DELIVERY_FAILED");
            } else {
                invitation.setDeliveryStatus(DELIVERED);
                invitation.setErrorCode(null);
                long timestamp = event.path("timestamp").asLong(0);
                invitation.setDeliveredAt(timestamp > 0 ? LocalDateTime.ofInstant(Instant.ofEpochSecond(timestamp), ZoneOffset.UTC)
                        : LocalDateTime.now(ZoneOffset.UTC));
            }
            invitations.save(invitation);
        });
    }
    private DomainException unauthorized() { return new DomainException("webhook", HttpStatus.UNAUTHORIZED, "Webhook no autorizado."); }
}
