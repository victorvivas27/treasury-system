package com.tesoreria.messaging.core;

public interface InvitationMessagePort {
    SendResult sendInvitation(String phone, String name, String application, String token);

    record SendResult(String messageId, String errorCode, boolean simulated) {
        public boolean accepted() { return errorCode == null; }
    }
}
