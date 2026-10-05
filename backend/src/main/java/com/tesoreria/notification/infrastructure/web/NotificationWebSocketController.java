package com.tesoreria.notification.infrastructure.web;

import com.tesoreria.notification.application.NotificationService;
import com.tesoreria.notification.application.RealtimeReply;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.security.core.Authentication;
import com.tesoreria.user.config.security.AccountIdentity;

@Controller
public class NotificationWebSocketController {
    private final NotificationService service;
    private final SimpMessagingTemplate messaging;
    public NotificationWebSocketController(NotificationService service, SimpMessagingTemplate messaging) {
        this.service = service; this.messaging = messaging;
    }

    @MessageMapping("/notifications.reply")
    public void reply(@Valid NotificationMessageRequest request, Authentication principal) {
        Long actorUserId = AccountIdentity.userId(principal);
        RealtimeReply saved = service.realtimeReply(request.deliveryId(),
                new NotificationReplyRequest(request.message()), actorUserId);
        NotificationReplyEvent event = new NotificationReplyEvent(saved.deliveryId(), saved.reply());
        messaging.convertAndSendToUser(String.valueOf(saved.recipientUserId()), "/queue/messages", event);
        messaging.convertAndSendToUser(String.valueOf(actorUserId), "/queue/messages", event);
        messaging.convertAndSendToUser(String.valueOf(saved.recipientUserId()), "/queue/notifications", event);
    }

    public record NotificationReplyEvent(Long deliveryId, NotificationReplyResponse reply) { }
}
