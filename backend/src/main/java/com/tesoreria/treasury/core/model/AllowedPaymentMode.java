package com.tesoreria.treasury.core.model;

public enum AllowedPaymentMode {
  ANUAL,
  DOS_CUOTAS,
  AMBAS;

  public boolean allows(PaymentMode mode) {
    return this == AMBAS || name().equals(mode.name());
  }
}
