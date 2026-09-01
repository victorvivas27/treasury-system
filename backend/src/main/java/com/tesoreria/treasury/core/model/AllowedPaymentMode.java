package com.tesoreria.treasury.core.model;

public enum AllowedPaymentMode {
    ANUAL,
    DOS_CUOTAS,
    AMBAS;

    public boolean allows(PaymentMode mode) {
        if (mode == PaymentMode.PERSONALIZADA) return true;
        return this == AMBAS || name().equals(mode.name());
    }
}
