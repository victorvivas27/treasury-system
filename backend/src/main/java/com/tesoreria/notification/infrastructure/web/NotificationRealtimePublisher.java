package com.tesoreria.notification.infrastructure.web;

import com.tesoreria.notification.application.NotificationCreatedEvent;
import com.tesoreria.notification.application.NotificationReplyDeletedEvent;
import com.tesoreria.notification.application.NotificationReplyCreatedEvent;
import com.tesoreria.notification.application.NotificationReadEvent;
import com.tesoreria.notification.application.NotificationReplyUpdatedEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class NotificationRealtimePublisher {
    private static final String MESSAGES_QUEUE = "/queue/messages";
    private final SimpMessagingTemplate messaging;
    public NotificationRealtimePublisher(SimpMessagingTemplate messaging) { this.messaging = messaging; }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notificationCreated(NotificationCreatedEvent event) {
        event.recipientEmails().forEach(email -> messaging.convertAndSendToUser(email,
                "/queue/notifications", event));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void replyCreated(NotificationReplyCreatedEvent event) {
        var saved = event.message();
        var message = new NotificationWebSocketController.NotificationReplyEvent(
                saved.deliveryId(), saved.reply());
        messaging.convertAndSendToUser(saved.recipientEmail(), MESSAGES_QUEUE, message);
        messaging.convertAndSendToUser(event.authorEmail(), MESSAGES_QUEUE, message);
        messaging.convertAndSendToUser(saved.recipientEmail(), "/queue/notifications", message);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void replyUpdated(NotificationReplyUpdatedEvent event) {
        var saved = event.message();
        var message = new ReplyUpdatedMessage(saved.deliveryId(), saved.reply());
        messaging.convertAndSendToUser(saved.recipientEmail(), MESSAGES_QUEUE, message);
        messaging.convertAndSendToUser(event.authorEmail(), MESSAGES_QUEUE, message);
    }

    public record ReplyUpdatedMessage(Long deliveryId, NotificationReplyResponse updatedReply) { }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void messagesRead(NotificationReadEvent event) {
        var receipt = new ReadReceipt(event.readMessageIds(), event.readDeliveryIds(), event.readAt());
        event.recipientEmails().stream().distinct().forEach(email ->
                messaging.convertAndSendToUser(email, MESSAGES_QUEUE, receipt));
    }

    public record ReadReceipt(java.util.List<Long> readMessageIds, java.util.List<Long> readDeliveryIds,
            java.time.LocalDateTime readAt) { }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void replyDeleted(NotificationReplyDeletedEvent event) {
        messaging.convertAndSendToUser(event.recipientEmail(), MESSAGES_QUEUE,
                new ReplyDeletedMessage(event.messageId()));
    }

    public record ReplyDeletedMessage(Long deletedMessageId) { }
}
