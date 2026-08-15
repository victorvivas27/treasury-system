package com.tesoreria.notification.application;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.notification.infrastructure.persistence.*;
import com.tesoreria.notification.infrastructure.web.*;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {
    private static final String NOTIFICATION_FIELD = "notification";
    private final NotificationJpaRepository notifications;
    private final UserNotificationJpaRepository deliveries;
    private final NotificationReplyJpaRepository replyRepository;
    private final UserJpaRepository users;
    private final ApoderadoJpaRepository guardians;

    public NotificationService(NotificationJpaRepository notifications,
            UserNotificationJpaRepository deliveries, NotificationReplyJpaRepository replyRepository,
            UserJpaRepository users,
            ApoderadoJpaRepository guardians) {
        this.notifications = notifications;
        this.deliveries = deliveries;
        this.replyRepository = replyRepository;
        this.users = users;
        this.guardians = guardians;
    }

    @Transactional
    public int send(NotificationRequest request, String creatorEmail) {
        UserEntity creator = currentUser(creatorEmail);
        List<UserEntity> recipients = resolveRecipients(request);
        if (recipients.isEmpty()) throw error("recipients", HttpStatus.BAD_REQUEST,
                "Debes seleccionar al menos un apoderado con acceso");
        LocalDateTime now = LocalDateTime.now();
        NotificationEntity notification = new NotificationEntity();
        notification.setTitle(request.title().trim());
        notification.setMessage(request.message().trim());
        notification.setType(request.type() == null ? "INFO" : request.type());
        notification.setCreatedBy(creator);
        notification.setCreatedAt(now);
        NotificationEntity saved = notifications.save(notification);
        List<UserNotificationEntity> rows = recipients.stream().map(user -> {
            UserNotificationEntity row = new UserNotificationEntity();
            row.setNotification(saved); row.setUser(user); row.setCreatedAt(now); row.setRead(false);
            row.setVisible(true);
            return row;
        }).toList();
        deliveries.saveAll(rows);
        return rows.size();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> mine(String email) {
        Long id = currentUser(email).getId();
        return deliveries.findByUserIdAndVisibleTrueOrderByCreatedAtDesc(id).stream()
                .map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(String email) {
        UserEntity user = currentUser(email);
        long notificationCount = deliveries.countByUserIdAndReadFalseAndVisibleTrue(user.getId());
        return notificationCount + replyRepository.countUnreadReceived(user.getId());
    }

    @Transactional(readOnly = true)
    public List<SentNotificationResponse> sent(String creatorEmail) {
        return notifications.findByCreatedByCorreoOrderByCreatedAtDesc(creatorEmail).stream()
                .map(notification -> new SentNotificationResponse(notification.getId(),
                        notification.getTitle(), notification.getMessage(), notification.getType(),
                        notification.getCreatedAt(), deliveries
                                .findByNotificationIdOrderByUserNombreAsc(notification.getId()).stream()
                                .map(row -> new SentNotificationResponse.RecipientStatus(
                                        row.getId(), row.getUser().getId(), row.getUser().getNombre(),
                                        row.getUser().getCorreo(), row.isRead(), row.getReadAt()))
                                .toList()))
                .toList();
    }

    @Transactional
    public NotificationResponse markRead(Long id, String email) {
        UserNotificationEntity row = deliveries.findByIdAndUserIdAndVisibleTrue(
                id, currentUser(email).getId())
                .orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                        "Notificación no encontrada"));
        if (!row.isRead()) { row.setRead(true); row.setReadAt(LocalDateTime.now()); }
        return response(deliveries.save(row));
    }

    @Transactional
    public void markAllRead(String email) {
        UserEntity user = currentUser(email);
        List<UserNotificationEntity> rows = deliveries.findByUserIdAndReadFalseAndVisibleTrue(user.getId());
        LocalDateTime now = LocalDateTime.now();
        rows.forEach(row -> { row.setRead(true); row.setReadAt(now); });
        deliveries.saveAll(rows);
        List<NotificationReplyEntity> unreadReplies = replyRepository.findUnreadReceived(user.getId());
        unreadReplies.forEach(reply -> { reply.setRead(true); reply.setReadAt(now); });
        replyRepository.saveAll(unreadReplies);
    }

    @Transactional
    public void deleteMine(Long id, String email) {
        UserNotificationEntity row = deliveries.findByIdAndUserIdAndVisibleTrue(
                id, currentUser(email).getId())
                .orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                        "Notificación no encontrada"));
        row.setVisible(false);
        deliveries.save(row);
    }

    @Transactional
    public void deleteSent(Long id, String creatorEmail) {
        NotificationEntity notification = notifications.findByIdAndCreatedByCorreo(id, creatorEmail)
                .orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                        "Notificación enviada no encontrada"));
        deliveries.deleteAllByNotificationId(notification.getId());
        notifications.delete(notification);
    }

    @Transactional
    public List<NotificationReplyResponse> replies(Long deliveryId, String email) {
        UserEntity user = currentUser(email);
        UserNotificationEntity delivery = accessibleDelivery(deliveryId, user);
        List<NotificationReplyEntity> conversation = replyRepository.findConversation(
                delivery.getUser().getId(),
                delivery.getNotification().getCreatedBy().getId());
        LocalDateTime now = LocalDateTime.now();
        conversation.stream().filter(reply -> !reply.isRead()
                && !reply.getAuthor().getId().equals(user.getId()))
                .forEach(reply -> { reply.setRead(true); reply.setReadAt(now); });
        replyRepository.saveAll(conversation.stream().filter(NotificationReplyEntity::isRead).toList());
        return conversation.stream()
                .map(this::replyResponse).toList();
    }

    @Transactional
    public NotificationReplyResponse reply(Long deliveryId, NotificationReplyRequest request,
            String email) {
        UserEntity author = currentUser(email);
        UserNotificationEntity delivery = accessibleDelivery(deliveryId, author);
        NotificationReplyEntity reply = new NotificationReplyEntity();
        reply.setDelivery(delivery);
        reply.setAuthor(author);
        reply.setMessage(request.message().trim());
        reply.setRead(false);
        reply.setCreatedAt(LocalDateTime.now());
        return replyResponse(replyRepository.save(reply));
    }

    private UserNotificationEntity accessibleDelivery(Long deliveryId, UserEntity user) {
        Optional<UserNotificationEntity> delivery = user.getRol() == RoleEnum.ADMIN
                ? deliveries.findByIdAndNotificationCreatedById(deliveryId, user.getId())
                : deliveries.findByIdAndUserIdAndVisibleTrue(deliveryId, user.getId());
        return delivery.orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                "Conversación no encontrada"));
    }

    private NotificationReplyResponse replyResponse(NotificationReplyEntity reply) {
        return new NotificationReplyResponse(reply.getId(), reply.getAuthor().getId(),
                reply.getAuthor().getNombre(), reply.getAuthor().getRol().name(),
                reply.getMessage(), reply.getCreatedAt());
    }

    private List<UserEntity> resolveRecipients(NotificationRequest request) {
        if (request.sendToAll()) return guardians.findAll().stream()
                .map(guardian -> users.findByCorreo(guardian.getEmail()).orElse(null))
                .filter(Objects::nonNull)
                .filter(user -> user.getRol() == RoleEnum.USER)
                .toList();
        if (request.recipientIds() == null || request.recipientIds().isEmpty()) return List.of();
        List<ApoderadoEntity> selected = guardians.findAllById(new LinkedHashSet<>(request.recipientIds()));
        if (selected.size() != new HashSet<>(request.recipientIds()).size())
            throw error("recipients", HttpStatus.BAD_REQUEST, "Uno o más apoderados no existen");
        List<UserEntity> resolved = selected.stream().map(guardian -> users.findByCorreo(guardian.getEmail())
                .orElseThrow(() -> error("recipients", HttpStatus.BAD_REQUEST,
                        "El apoderado " + guardian.getNombre() + " todavía no tiene acceso"))).toList();
        return resolved.stream().collect(java.util.stream.Collectors.toMap(UserEntity::getId,
                user -> user, (first, second) -> first, LinkedHashMap::new)).values().stream().toList();
    }

    private UserEntity currentUser(String email) {
        return users.findByCorreo(email).orElseThrow(() ->
                new DomainException(UserErrorCode.NOT_FOUND.getField(),
                        UserErrorCode.NOT_FOUND.getStatus(), "Usuario no encontrado"));
    }

    private NotificationResponse response(UserNotificationEntity row) {
        NotificationEntity value = row.getNotification();
        return new NotificationResponse(row.getId(), value.getTitle(), value.getMessage(),
                value.getType(), row.isRead(), row.getReadAt(), row.getCreatedAt());
    }

    private DomainException error(String field, HttpStatus status, String message) {
        return new DomainException(field, status, message);
    }
}
