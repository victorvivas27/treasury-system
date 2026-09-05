package com.tesoreria.notification.application;

public record NotificationReplyCreatedEvent(RealtimeReply message, String authorEmail) { }
