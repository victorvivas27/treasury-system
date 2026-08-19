package com.tesoreria.notification.infrastructure.web;

import com.tesoreria.notification.application.NotificationService;
import com.tesoreria.notification.application.RealtimeReply;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
public class NotificationWebSocketController {
    private final NotificationService service;
    private final SimpMessagingTemplate messaging;
    public NotificationWebSocketController(NotificationService service, SimpMessagingTemplate messaging) {
        this.service = service; this.messaging = messaging;
    }

    @MessageMapping("/notifications.reply")
    public void reply(@Valid NotificationMessageRequest request, Principal principal) {
        RealtimeReply saved = service.realtimeReply(request.deliveryId(),
                new NotificationReplyRequest(request.message()), principal.getName());
        NotificationReplyEvent event = new NotificationReplyEvent(saved.deliveryId(), saved.reply());
        messaging.convertAndSendToUser(saved.recipientEmail(), "/queue/messages", event);
        messaging.convertAndSendToUser(principal.getName(), "/queue/messages", event);
        messaging.convertAndSendToUser(saved.recipientEmail(), "/queue/notifications", event);
    }

    public record NotificationReplyEvent(Long deliveryId, NotificationReplyResponse reply) { }
}
