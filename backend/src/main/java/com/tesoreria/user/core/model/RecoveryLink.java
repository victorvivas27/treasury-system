package com.tesoreria.user.core.model;

public record RecoveryLink(String course, String url) {
    @Override public String toString() { return "RecoveryLink[redacted]"; }
}
