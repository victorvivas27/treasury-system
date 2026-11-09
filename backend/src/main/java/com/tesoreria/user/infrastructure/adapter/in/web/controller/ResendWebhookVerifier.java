package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

@Component
public class ResendWebhookVerifier {
    private static final long TOLERANCE_SECONDS = 300;
    private final String secret;
    public ResendWebhookVerifier(@Value("${app.email.resend.webhook-secret:}") String secret) { this.secret = secret; }

    public void verify(byte[] payload, String id, String timestamp, String signatures) {
        if (secret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        try {
            if (id == null || timestamp == null || signatures == null || id.length() > 255 || signatures.length() > 2048) {
                throw new IllegalArgumentException();
            }
            long seconds = Long.parseLong(timestamp);
            long now = Instant.now().getEpochSecond();
            if (seconds < now - TOLERANCE_SECONDS || seconds > now + TOLERANCE_SECONDS) throw new IllegalArgumentException();
            String encoded = secret.startsWith("whsec_") ? secret.substring(6) : secret;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(Base64.getDecoder().decode(encoded), "HmacSHA256"));
            mac.update((id + "." + timestamp + ".").getBytes(StandardCharsets.UTF_8));
            byte[] expected = mac.doFinal(payload);
            for (String signature : signatures.split(" ")) {
                if (signature.startsWith("v1,")
                        && MessageDigest.isEqual(expected, Base64.getDecoder().decode(signature.substring(3)))) return;
            }
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature", exception);
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }
}
