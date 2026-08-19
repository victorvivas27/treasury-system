package com.tesoreria.notification.application;

import com.tesoreria.notification.infrastructure.web.NotificationReplyResponse;

public record RealtimeReply(Long deliveryId, NotificationReplyResponse reply,
        String recipientEmail) { }
