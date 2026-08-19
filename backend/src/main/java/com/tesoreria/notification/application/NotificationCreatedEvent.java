package com.tesoreria.notification.application;

import java.util.List;

public record NotificationCreatedEvent(Long notificationId, List<String> recipientEmails) { }
