package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import com.tesoreria.user.application.usecase.InvitationDeliveryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/email/resend")
public class ResendWebhookController {
    private static final int MAX_BODY_BYTES = 65_536;
    private final ResendWebhookVerifier verifier;
    private final InvitationDeliveryService deliveries;
    private final ObjectMapper mapper;
    public ResendWebhookController(ResendWebhookVerifier verifier, InvitationDeliveryService deliveries, ObjectMapper mapper) {
        this.verifier = verifier;
        this.deliveries = deliveries;
        this.mapper = mapper;
    }

    @PostMapping("/webhook")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void receive(HttpServletRequest request,
                        @RequestHeader(value = "svix-id", required = false) String id,
                        @RequestHeader(value = "svix-timestamp", required = false) String timestamp,
                        @RequestHeader(value = "svix-signature", required = false) String signature) throws IOException {
        byte[] body = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        if (body.length > MAX_BODY_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        verifier.verify(body, id, timestamp, signature);
        String messageId;
        String event;
        Instant occurred;
        boolean invitation;
        try {
            var payload = mapper.readTree(new String(body, StandardCharsets.UTF_8));
            event = payload.path("type").asString("");
            messageId = payload.path("data").path("email_id").asString("");
            if (!messageId.matches("[A-Za-z0-9-]{1,255}")) throw new IllegalArgumentException();
            occurred = Instant.parse(payload.path("created_at").asString(""));
            invitation = "guardian_invitation".equals(payload.path("data").path("tags").path("purpose").asString(""));
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid webhook payload", exception);
        }
        deliveries.receive(messageId, event, occurred, invitation);
    }
}
