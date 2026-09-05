package com.tesoreria.notification.application;

import java.time.LocalDateTime;
import java.util.List;

public record NotificationReadEvent(List<Long> readMessageIds, List<Long> readDeliveryIds,
        LocalDateTime readAt, List<String> recipientEmails) { }
