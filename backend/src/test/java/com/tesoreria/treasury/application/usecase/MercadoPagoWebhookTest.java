package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.config.MercadoPagoSettings;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MercadoPagoWebhookTest {
    private final MercadoPagoService service = mock(MercadoPagoService.class);
    private final MercadoPagoWebhook webhook = new MercadoPagoWebhook(new MercadoPagoSettings("token", "secret",
            7L, "123", "https://curso.test/pagos", "https://api.test/webhook", true), service);

    @Test void rejectsMissingOrTamperedSignature() throws Exception {
        assertThrows(DomainException.class, () -> webhook.receive("42", null, "request"));
        String signature = signature();
        assertThrows(DomainException.class, () -> webhook.receive("43", signature, "request"));
        assertThrows(DomainException.class, () -> webhook.receive("42", signature, "other"));
        verifyNoInteractions(service);
    }

    @Test void verifiedNotificationSelectsTenantAndRestoresContextOnFailure() throws Exception {
        var previous = SecurityContextHolder.getContext();
        when(service.reconcileNotification("42")).thenAnswer(invocation -> {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            assertEquals(7L, ((TenantUserDetails) authentication.getPrincipal()).getOrganizationId());
            assertTrue(authentication.getAuthorities().isEmpty());
            throw new IllegalStateException("retry");
        });
        String signature = signature();
        assertThrows(IllegalStateException.class, () -> webhook.receive("42", signature, "request"));
        assertSame(previous, SecurityContextHolder.getContext());
    }

    private String signature() throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "ts=123,v1=" + HexFormat.of().formatHex(mac.doFinal("id:42;request-id:request;ts:123;".getBytes(StandardCharsets.UTF_8)));
    }
}
