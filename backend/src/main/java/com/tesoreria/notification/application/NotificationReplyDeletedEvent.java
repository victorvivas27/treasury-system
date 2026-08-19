package com.tesoreria.notification.application;

public record NotificationReplyDeletedEvent(Long messageId, String recipientEmail) { }
