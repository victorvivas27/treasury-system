package com.tesoreria.notification.infrastructure.push;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.tesoreria.notification.application.NotificationService;
import com.tesoreria.notification.application.PushRequestedEvent;
import com.tesoreria.notification.config.WebPushProperties;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionEntity;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import java.util.*;

@Component
public class NotificationPushPublisher {
    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationPushPublisher.class);
    private static final int MAX_BODY_LENGTH = 240;
    private final WebPushSubscriptionJpaRepository subscriptions;
    private final NotificationService notifications;
    private final WebPushSender sender;
    private final ObjectMapper objectMapper;
    private final WebPushProperties properties;

    public NotificationPushPublisher(WebPushSubscriptionJpaRepository subscriptions,
            NotificationService notifications, WebPushSender sender, ObjectMapper objectMapper,
            WebPushProperties properties) {
        this.subscriptions = subscriptions;
        this.notifications = notifications;
        this.sender = sender;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Async("pushTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(PushRequestedEvent event) {
        if (!properties.configured() || event.recipientUserIds().isEmpty()) return;
        List<WebPushSubscriptionEntity> targets = subscriptions
                .findByUserIdIn(new LinkedHashSet<>(event.recipientUserIds()));
        if (targets.isEmpty()) return;
        Map<Long, Long> unreadByUserId = new HashMap<>();
        List<WebPushSubscriptionEntity> expired = new ArrayList<>();
        for (WebPushSubscriptionEntity subscription : targets) {
            UserEntity user = subscription.getUser();
            long unread = unreadByUserId.computeIfAbsent(user.getId(),
                    notifications::unreadCount);
            String payload = payload(event, unread);
            try {
                if (sender.send(subscription, payload) == WebPushSender.SendResult.EXPIRED) {
                    expired.add(subscription);
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                if (LOGGER.isWarnEnabled()) {
                    LOGGER.warn("Se interrumpió el envío Web Push para {}", user.getCorreo());
                }
                break;
            } catch (Exception exception) {
                if (LOGGER.isWarnEnabled()) {
                    LOGGER.warn("No fue posible enviar Web Push a la suscripción {}: {}",
                            subscription.getId(), exception.getMessage());
                }
            }
        }
        if (!expired.isEmpty()) subscriptions.deleteAll(expired);
    }

    private String payload(PushRequestedEvent event, long unread) {
        PushPayload value = new PushPayload(event.title(), truncate(event.message()), event.tag(),
                event.path(), unread, "/icono-tesoreria.png", "/favicon-tesoreria-v3.png");
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("No fue posible crear la notificación push", exception);
        }
    }

    private String truncate(String value) {
        if (value.length() <= MAX_BODY_LENGTH) return value;
        return value.substring(0, MAX_BODY_LENGTH - 1).stripTrailing() + "…";
    }

    private record PushPayload(String title, String body, String tag, String url,
                               long badgeCount, String icon, String badge) { }
}
