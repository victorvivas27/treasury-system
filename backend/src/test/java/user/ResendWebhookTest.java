package user;

import com.tesoreria.user.application.usecase.InvitationDeliveryService;
import com.tesoreria.user.infrastructure.adapter.in.web.controller.ResendWebhookController;
import com.tesoreria.user.infrastructure.adapter.in.web.controller.ResendWebhookVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ResendWebhookTest {
    private static final String SECRET = "whsec_" + Base64.getEncoder().encodeToString("fixture-signing-secret".getBytes(StandardCharsets.UTF_8));
    private final ResendWebhookVerifier verifier = new ResendWebhookVerifier(SECRET);

    private String signature(String body, String timestamp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(Base64.getDecoder().decode(SECRET.substring(6)), "HmacSHA256"));
        return "v1," + Base64.getEncoder().encodeToString(mac.doFinal(("fixture-id." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
    }

    @Test void validRawPayloadIsAcceptedAndTamperingMissingHeadersAndReplayAreRejected() throws Exception {
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String body = "{\"type\":\"email.delivered\"}";
        String signature = signature(body, timestamp);
        assertDoesNotThrow(() -> verifier.verify(body.getBytes(StandardCharsets.UTF_8), "fixture-id", timestamp, signature));
        assertThrows(ResponseStatusException.class, () -> verifier.verify((body + " ").getBytes(StandardCharsets.UTF_8), "fixture-id", timestamp, signature));
        assertThrows(ResponseStatusException.class, () -> verifier.verify(body.getBytes(StandardCharsets.UTF_8), null, timestamp, signature));
        String old = Long.toString(Instant.now().minusSeconds(600).getEpochSecond());
        String oldSignature = signature(body, old);
        assertThrows(ResponseStatusException.class, () -> verifier.verify(body.getBytes(StandardCharsets.UTF_8), "fixture-id", old, oldSignature));
        assertThrows(ResponseStatusException.class, () -> verifier.verify(body.getBytes(StandardCharsets.UTF_8), "fixture-id", timestamp, "v1,broken"));
    }

    @Test void missingConfigurationFailsClosed() {
        assertEquals(503, assertThrows(ResponseStatusException.class,
                () -> new ResendWebhookVerifier("").verify(new byte[0], null, null, null)).getStatusCode().value());
    }

    @Test void controllerUpdatesOnlyVerifiedPayloads() throws Exception {
        var service = mock(InvitationDeliveryService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new ResendWebhookController(verifier, service, new ObjectMapper())).build();
        Instant now = Instant.now();
        String body = "{\"type\":\"email.delivered\",\"created_at\":\"" + now
                + "\",\"data\":{\"email_id\":\"provider-fixture\",\"tags\":{\"purpose\":\"guardian_invitation\"}}}";
        String timestamp = Long.toString(now.getEpochSecond());
        mvc.perform(post("/api/v1/email/resend/webhook").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
        mvc.perform(post("/api/v1/email/resend/webhook").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("svix-id", "fixture-id").header("svix-timestamp", timestamp).header("svix-signature", signature(body, timestamp)))
                .andExpect(status().isNoContent());
        verify(service).receive("provider-fixture", "email.delivered", now, true);
    }
}
