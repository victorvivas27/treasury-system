package com.tesoreria.treasury.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record MercadoPagoSettings(
        @Value("${MERCADO_PAGO_ACCESS_TOKEN:}") String accessToken,
        @Value("${MERCADO_PAGO_WEBHOOK_SECRET:}") String webhookSecret,
        @Value("${MERCADO_PAGO_ORGANIZATION_ID:0}") long organizationId,
        @Value("${MERCADO_PAGO_COLLECTOR_ID:}") String collectorId,
        @Value("${MERCADO_PAGO_RETURN_URL:}") String returnUrl,
        @Value("${MERCADO_PAGO_WEBHOOK_URL:}") String webhookUrl,
        @Value("${MERCADO_PAGO_TEST_MODE:true}") boolean testMode) {
    public boolean enabled() {
        return !accessToken.isBlank() && !webhookSecret.isBlank() && organizationId > 0
                && !collectorId.isBlank() && validHttps(returnUrl) && validHttps(webhookUrl);
    }

    private boolean validHttps(String value) {
        try {
            java.net.URI uri = java.net.URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost() != null
                    && uri.getQuery() == null && uri.getFragment() == null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    @Override public String toString() { return "MercadoPagoSettings[credentials redacted]"; }
}
