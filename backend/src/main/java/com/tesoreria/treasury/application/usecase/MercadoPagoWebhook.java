package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.config.MercadoPagoSettings;
import com.tesoreria.user.core.constant.RoleEnum;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;

@Service
public class MercadoPagoWebhook {
    private static final int SIGNATURE_PAIR_LENGTH = 2;
    private static final String TIMESTAMP_KEY = "ts";
    private static final String DIGEST_KEY = "v1";
    private final MercadoPagoSettings settings;
    private final MercadoPagoService service;

    public MercadoPagoWebhook(MercadoPagoSettings settings, MercadoPagoService service) {
        this.settings = settings; this.service = service;
    }

    public void receive(String id, String signature, String requestId) {
        verify(id, signature, requestId);
        SecurityContext previous = SecurityContextHolder.getContext();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        // No user permissions are granted. The verified notification selects only the configured tenant.
        TenantUserDetails principal = new TenantUserDetails(null, settings.organizationId(),
                "mercado-pago-webhook", "", RoleEnum.USER, true, true);
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        try {
            SecurityContextHolder.setContext(context);
            service.reconcileNotification(id);
        } finally {
            SecurityContextHolder.setContext(previous);
        }
    }

    void verify(String id, String signature, String requestId) {
        if (!settings.enabled()) throw new DomainException("pago", HttpStatus.SERVICE_UNAVAILABLE, "Mercado Pago no está configurado");
        if (id == null || !id.matches("[0-9]{1,30}") || signature == null || requestId == null || requestId.isBlank())
            throw invalidSignature();
        String timestamp = null;
        String digest = null;
        for (String part : signature.split(",")) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length == SIGNATURE_PAIR_LENGTH && TIMESTAMP_KEY.equals(pair[0])) timestamp = pair[1];
            if (pair.length == SIGNATURE_PAIR_LENGTH && DIGEST_KEY.equals(pair[0])) digest = pair[1];
        }
        if (timestamp == null || !timestamp.matches("[0-9]{1,16}") || digest == null || !digest.matches("[a-fA-F0-9]{64}"))
            throw invalidSignature();
        String manifest = "id:" + id + ";request-id:" + requestId + ";ts:" + timestamp + ";";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(settings.webhookSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            if (!MessageDigest.isEqual(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)), HexFormat.of().parseHex(digest)))
                throw invalidSignature();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("No fue posible verificar la firma", exception);
        }
    }

    private DomainException invalidSignature() {
        return new DomainException("pago", HttpStatus.UNAUTHORIZED, "Firma de notificación inválida");
    }
}
