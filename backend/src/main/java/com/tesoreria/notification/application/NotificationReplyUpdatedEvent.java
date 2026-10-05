package com.tesoreria.notification.application;

public record NotificationReplyUpdatedEvent(RealtimeReply message, Long authorUserId) { }
