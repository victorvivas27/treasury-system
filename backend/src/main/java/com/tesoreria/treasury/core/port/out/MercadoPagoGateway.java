package com.tesoreria.treasury.core.port.out;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public interface MercadoPagoGateway {
    Checkout createPreference(String reference, String concept, BigDecimal amount, int year);
    ProviderPayment getPayment(String paymentId);
    record Checkout(String preferenceId, String checkoutUrl) { }
    record ProviderPayment(String id, String reference, String status, BigDecimal amount,
                           String currency, String collectorId, boolean liveMode, OffsetDateTime paidAt) { }
}
