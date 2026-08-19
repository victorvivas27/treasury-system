package com.tesoreria.notification.infrastructure.web;

import com.tesoreria.notification.application.NotificationCreatedEvent;
import com.tesoreria.notification.application.NotificationReplyDeletedEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class NotificationRealtimePublisher {
    private final SimpMessagingTemplate messaging;
    public NotificationRealtimePublisher(SimpMessagingTemplate messaging) { this.messaging = messaging; }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notificationCreated(NotificationCreatedEvent event) {
        event.recipientEmails().forEach(email -> messaging.convertAndSendToUser(email,
                "/queue/notifications", event));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void replyDeleted(NotificationReplyDeletedEvent event) {
        messaging.convertAndSendToUser(event.recipientEmail(), "/queue/messages",
                new ReplyDeletedMessage(event.messageId()));
    }

    public record ReplyDeletedMessage(Long deletedMessageId) { }
}
