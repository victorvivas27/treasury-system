package com.tesoreria.notification.application;

public record NotificationReplyUpdatedEvent(RealtimeReply message, String authorEmail) { }
