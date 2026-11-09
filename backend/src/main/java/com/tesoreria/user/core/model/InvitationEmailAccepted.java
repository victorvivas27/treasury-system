package com.tesoreria.user.core.model;

public record InvitationEmailAccepted(String messageId, String recipient) {
    @Override public String toString() { return "InvitationEmailAccepted[redacted]"; }
}
