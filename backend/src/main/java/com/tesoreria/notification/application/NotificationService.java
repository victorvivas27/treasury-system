package com.tesoreria.notification.application;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.notification.infrastructure.persistence.*;
import com.tesoreria.notification.infrastructure.web.*;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {
    private static final String NOTIFICATION_FIELD = "notification";
    private static final String MESSAGE_FIELD = "message";
    private static final String RECIPIENTS_FIELD = "recipients";
    private static final String NOTIFICATIONS_PATH = "/notifications";
    private static final long MESSAGE_EDIT_MINUTES = 15;
    private static final int EXPECTED_ADMIN_COUNT = 1;
    private final NotificationJpaRepository notifications;
    private final UserNotificationJpaRepository deliveries;
    private final NotificationReplyJpaRepository replyRepository;
    private final UserJpaRepository users;
    private final ApoderadoJpaRepository guardians;
    private final ApplicationEventPublisher events;

    public NotificationService(NotificationJpaRepository notifications,
            UserNotificationJpaRepository deliveries, NotificationReplyJpaRepository replyRepository,
            UserJpaRepository users,
            ApoderadoJpaRepository guardians, ApplicationEventPublisher events) {
        this.notifications = notifications;
        this.deliveries = deliveries;
        this.replyRepository = replyRepository;
        this.users = users;
        this.guardians = guardians;
        this.events = events;
    }

    @Transactional
    public int send(NotificationRequest request, String creatorEmail) {
        UserEntity creator = currentUser(creatorEmail);
        List<UserEntity> recipients = resolveRecipients(request, creator.getOrganizationId());
        if (recipients.isEmpty()) throw error(RECIPIENTS_FIELD, HttpStatus.BAD_REQUEST,
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
        List<String> recipientEmails = recipients.stream().map(UserEntity::getCorreo).toList();
        List<Long> recipientUserIds = recipients.stream().map(UserEntity::getId).toList();
        events.publishEvent(new NotificationCreatedEvent(saved.getId(), recipientEmails));
        events.publishEvent(new PushRequestedEvent("notification-" + saved.getId(),
                saved.getTitle(), saved.getMessage(), NOTIFICATIONS_PATH,
                recipientEmails, recipientUserIds));
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
        return unreadCount(user.getId());
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        long notificationCount = deliveries.countByUserIdAndReadFalseAndVisibleTrue(userId);
        return notificationCount + replyRepository.countUnreadReceived(userId);
    }

    @Transactional(readOnly = true)
    public List<SentNotificationResponse> sent(String creatorEmail) {
        UserEntity creator = currentUser(creatorEmail);
        List<NotificationEntity> sentNotifications = notifications
                .findByCreatedByIdOrderByCreatedAtDesc(creator.getId());
        if (sentNotifications.isEmpty()) return List.of();
        Map<Long, List<UserNotificationEntity>> recipientsByNotification = new LinkedHashMap<>();
        sentNotifications.forEach(notification ->
                recipientsByNotification.put(notification.getId(), new ArrayList<>()));
        deliveries.findByNotificationIdInWithUserOrderByNotificationAndUserName(
                recipientsByNotification.keySet()).forEach(row ->
                        recipientsByNotification.get(row.getNotification().getId()).add(row));

        return sentNotifications.stream().map(notification -> new SentNotificationResponse(
                notification.getId(), notification.getTitle(), notification.getMessage(),
                notification.getType(), notification.getCreatedAt(),
                recipientsByNotification.getOrDefault(notification.getId(), List.of()).stream()
                        .map(row -> {
                            UserEntity recipient = row.getUser();
                            return new SentNotificationResponse.RecipientStatus(
                                    row.getId(), recipient.getId(), recipient.getNombre(),
                                    recipient.getCorreo(), row.isRead(), row.getReadAt(),
                                    recipient.getProfileImageType().name(),
                                    recipient.getProfileImageUrl());
                        }).toList())).toList();
    }

    @Transactional
    public NotificationResponse markRead(Long id, String email) {
        UserNotificationEntity row = deliveries.findByIdAndUserIdAndVisibleTrue(
                id, currentUser(email).getId())
                .orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                        "Notificación no encontrada"));
        if (!row.isRead()) {
            row.setRead(true); row.setReadAt(LocalDateTime.now());
            publishDeliveryRead(row);
        }
        return response(deliveries.save(row));
    }

    @Transactional
    public void markAllRead(String email) {
        UserEntity user = currentUser(email);
        List<UserNotificationEntity> rows = deliveries.findByUserIdAndReadFalseAndVisibleTrue(user.getId());
        LocalDateTime now = LocalDateTime.now();
        rows.forEach(row -> {
            row.setRead(true); row.setReadAt(now); publishDeliveryRead(row);
        });
        deliveries.saveAll(rows);
        List<NotificationReplyEntity> unreadReplies = replyRepository.findUnreadReceived(user.getId());
        unreadReplies.forEach(reply -> {
            reply.setRead(true); reply.setReadAt(now); publishReplyRead(reply, user);
        });
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
        UserEntity creator = currentUser(creatorEmail);
        NotificationEntity notification = notifications.findByIdAndCreatedById(id, creator.getId())
                .orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                        "Notificación enviada no encontrada"));
        replyRepository.deleteAllByNotificationId(notification.getId());
        deliveries.deleteAllByNotificationId(notification.getId());
        notifications.deleteById(notification.getId());
        notifications.flush();
    }

    @Transactional
    public List<NotificationReplyResponse> replies(Long deliveryId, String email) {
        UserEntity user = currentUser(email);
        UserNotificationEntity delivery = accessibleDelivery(deliveryId, user);
        List<NotificationReplyEntity> conversation = replyRepository.findConversation(
                delivery.getUser().getId(),
                delivery.getNotification().getCreatedBy().getId(), user.getId());
        LocalDateTime now = LocalDateTime.now();
        List<NotificationReplyEntity> receivedUnread = conversation.stream()
                .filter(reply -> !reply.isRead()
                        && !reply.getAuthor().getId().equals(user.getId()))
                .toList();
        receivedUnread.forEach(reply -> {
            reply.setRead(true); reply.setReadAt(now); publishReplyRead(reply, user);
        });
        replyRepository.saveAll(receivedUnread);
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
        NotificationReplyEntity saved = replyRepository.save(reply);
        String recipientEmail = otherParticipantEmail(delivery, author);
        events.publishEvent(new PushRequestedEvent("reply-" + saved.getId(),
                "Nuevo mensaje de " + author.getNombre(), saved.getMessage(), NOTIFICATIONS_PATH,
                List.of(recipientEmail), List.of(otherParticipantId(delivery, author))));
        NotificationReplyResponse response = replyResponse(saved);
        events.publishEvent(new NotificationReplyCreatedEvent(
                new RealtimeReply(deliveryId, response, recipientEmail), author.getCorreo()));
        return response;
    }

    @Transactional
    public RealtimeReply realtimeReply(Long deliveryId, NotificationReplyRequest request, String email) {
        UserEntity author = currentUser(email);
        UserNotificationEntity delivery = accessibleDelivery(deliveryId, author);
        NotificationReplyEntity reply = new NotificationReplyEntity();
        reply.setDelivery(delivery);
        reply.setAuthor(author);
        reply.setMessage(request.message().trim());
        reply.setRead(false);
        reply.setCreatedAt(LocalDateTime.now());
        NotificationReplyResponse saved = replyResponse(replyRepository.save(reply));
        String recipientEmail = otherParticipantEmail(delivery, author);
        events.publishEvent(new PushRequestedEvent("reply-" + reply.getId(),
                "Nuevo mensaje de " + author.getNombre(), reply.getMessage(), NOTIFICATIONS_PATH,
                List.of(recipientEmail), List.of(otherParticipantId(delivery, author))));
        return new RealtimeReply(deliveryId, saved, recipientEmail);
    }

    @Transactional
    public RealtimeReply startTreasuryConversation(NotificationReplyRequest request, String email) {
        UserEntity guardian = currentUser(email);
        if (isAdministrative(guardian))
            throw error("recipient", HttpStatus.BAD_REQUEST,
                    "La conversación con Tesorería debe iniciarla un apoderado");
        UserEntity admin = soleTreasuryAdmin(guardian.getOrganizationId());
        LocalDateTime now = LocalDateTime.now();
        NotificationEntity notification = new NotificationEntity();
        notification.setTitle("Conversación con Tesorería");
        notification.setMessage("Canal de atención iniciado por " + guardian.getNombre() + ".");
        notification.setType("INFO");
        notification.setCreatedBy(admin);
        notification.setCreatedAt(now);
        NotificationEntity savedNotification = notifications.save(notification);
        UserNotificationEntity delivery = new UserNotificationEntity();
        delivery.setNotification(savedNotification);
        delivery.setUser(guardian);
        delivery.setRead(true);
        delivery.setCreatedAt(now);
        delivery.setVisible(true);
        UserNotificationEntity savedDelivery = deliveries.save(delivery);
        NotificationReplyEntity reply = new NotificationReplyEntity();
        reply.setDelivery(savedDelivery);
        reply.setAuthor(guardian);
        reply.setMessage(request.message().trim());
        reply.setRead(false);
        reply.setCreatedAt(now);
        NotificationReplyResponse savedReply = replyResponse(replyRepository.save(reply));
        events.publishEvent(new NotificationCreatedEvent(savedNotification.getId(),
                List.of(admin.getCorreo())));
        events.publishEvent(new PushRequestedEvent("reply-" + reply.getId(),
                "Nuevo mensaje de " + guardian.getNombre(), reply.getMessage(), NOTIFICATIONS_PATH,
                List.of(admin.getCorreo()), List.of(admin.getId())));
        return new RealtimeReply(savedDelivery.getId(), savedReply, admin.getCorreo());
    }

    @Transactional(readOnly = true)
    public TreasuryContactResponse treasuryContact(String email) {
        UserEntity requester = currentUser(email);
        if (isAdministrative(requester))
            throw error("recipient", HttpStatus.BAD_REQUEST,
                    "El contacto de Tesorería está disponible para apoderados");
        UserEntity admin = soleTreasuryAdmin(requester.getOrganizationId());
        return new TreasuryContactResponse(admin.getId(), admin.getNombre(), admin.getCorreo(),
                admin.getProfileImageType().name(), admin.getProfileImageUrl());
    }

    private UserEntity soleTreasuryAdmin(Long organizationId) {
        List<UserEntity> candidates = organizationId == null
                ? users.findByRolOrderByIdAsc(RoleEnum.ADMIN)
                : users.findByRolInAndOrganizationIdOrderByIdAsc(
                        List.of(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN), organizationId);
        List<UserEntity> admins = candidates.stream()
                .filter(user -> user.getRol() == RoleEnum.ADMIN).toList();
        if (admins.isEmpty()) admins = candidates;
        if (admins.size() != EXPECTED_ADMIN_COUNT)
            throw error("recipient", HttpStatus.CONFLICT,
                    "No existe una cuenta única de Tesorería disponible");
        return admins.get(0);
    }

    @Transactional
    public NotificationReplyResponse editReply(Long id, NotificationReplyRequest request, String email) {
        NotificationReplyEntity reply = ownEditableReply(id, email);
        reply.setMessage(request.message().trim());
        reply.setUpdatedAt(LocalDateTime.now());
        NotificationReplyResponse updated = replyResponse(replyRepository.save(reply));
        UserNotificationEntity delivery = reply.getDelivery();
        UserEntity author = reply.getAuthor();
        events.publishEvent(new NotificationReplyUpdatedEvent(new RealtimeReply(delivery.getId(),
                updated, otherParticipantEmail(delivery, author)), author.getCorreo()));
        return updated;
    }

    @Transactional
    public void deleteReply(Long id, String email) {
        UserEntity user = currentUser(email);
        NotificationReplyEntity reply = replyRepository.findById(id)
                .orElseThrow(() -> error(MESSAGE_FIELD, HttpStatus.NOT_FOUND, "Mensaje no encontrado"));
        UserNotificationEntity delivery = reply.getDelivery();
        Long creatorId = delivery.getNotification().getCreatedBy().getId();
        Long recipientId = delivery.getUser().getId();
        if (!user.getId().equals(creatorId) && !user.getId().equals(recipientId))
            throw error(MESSAGE_FIELD, HttpStatus.NOT_FOUND, "Mensaje no encontrado");
        if (user.getId().equals(reply.getAuthor().getId())) {
            String recipientEmail = user.getId().equals(creatorId)
                    ? delivery.getUser().getCorreo()
                    : delivery.getNotification().getCreatedBy().getCorreo();
            replyRepository.delete(reply);
            events.publishEvent(new NotificationReplyDeletedEvent(reply.getId(), recipientEmail));
        } else {
            replyRepository.hideForUser(reply.getId(), user.getId());
        }
    }

    private NotificationReplyEntity ownEditableReply(Long id, String email) {
        UserEntity author = currentUser(email);
        NotificationReplyEntity reply = replyRepository.findByIdAndAuthorId(id, author.getId())
                .orElseThrow(() -> error(MESSAGE_FIELD, HttpStatus.NOT_FOUND, "Mensaje no encontrado"));
        if (reply.getCreatedAt().plusMinutes(MESSAGE_EDIT_MINUTES).isBefore(LocalDateTime.now()))
            throw error(MESSAGE_FIELD, HttpStatus.CONFLICT,
                    "El plazo de 15 minutos para modificar el mensaje terminó");
        return reply;
    }

    private UserNotificationEntity accessibleDelivery(Long deliveryId, UserEntity user) {
        Optional<UserNotificationEntity> delivery = isAdministrative(user)
                ? deliveries.findByIdAndNotificationCreatedById(deliveryId, user.getId())
                : deliveries.findByIdAndUserId(deliveryId, user.getId());
        return delivery.orElseThrow(() -> error(NOTIFICATION_FIELD, HttpStatus.NOT_FOUND,
                "Conversación no encontrada"));
    }

    private boolean isAdministrative(UserEntity user) {
        return user.getRol() == RoleEnum.ADMIN || user.getRol() == RoleEnum.SUPER_ADMIN;
    }

    private String otherParticipantEmail(UserNotificationEntity delivery, UserEntity author) {
        UserEntity creator = delivery.getNotification().getCreatedBy();
        return author.getId().equals(creator.getId())
                ? delivery.getUser().getCorreo() : creator.getCorreo();
    }

    private Long otherParticipantId(UserNotificationEntity delivery, UserEntity author) {
        UserEntity creator = delivery.getNotification().getCreatedBy();
        return author.getId().equals(creator.getId())
                ? delivery.getUser().getId() : creator.getId();
    }

    private NotificationReplyResponse replyResponse(NotificationReplyEntity reply) {
        UserEntity author = reply.getAuthor();
        return new NotificationReplyResponse(reply.getId(), author.getId(),
                author.getNombre(), author.getRol().name(), author.getProfileImageType().name(),
                author.getProfileImageUrl(),
                reply.getMessage(), reply.getCreatedAt(), reply.isRead(), reply.getReadAt(), reply.getUpdatedAt());
    }

    private void publishReplyRead(NotificationReplyEntity reply, UserEntity reader) {
        events.publishEvent(new NotificationReadEvent(List.of(reply.getId()), List.of(),
                reply.getReadAt(), List.of(reply.getAuthor().getCorreo(), reader.getCorreo())));
    }

    private void publishDeliveryRead(UserNotificationEntity delivery) {
        events.publishEvent(new NotificationReadEvent(List.of(), List.of(delivery.getId()),
                delivery.getReadAt(), List.of(delivery.getNotification().getCreatedBy().getCorreo(),
                        delivery.getUser().getCorreo())));
    }

    private List<UserEntity> resolveRecipients(NotificationRequest request, Long organizationId) {
        if (request.sendToAll()) return guardians.findAll().stream()
                .map(guardian -> users.findByCorreoAndOrganizationId(
                        guardian.getEmail(), organizationId).orElse(null))
                .filter(Objects::nonNull)
                .filter(user -> Objects.equals(organizationId, user.getOrganizationId()))
                .filter(user -> user.getRol() == RoleEnum.USER)
                .toList();
        if (request.recipientIds() == null || request.recipientIds().isEmpty()) return List.of();
        List<ApoderadoEntity> selected = guardians.findAllById(new LinkedHashSet<>(request.recipientIds()));
        if (selected.size() != new HashSet<>(request.recipientIds()).size())
            throw error(RECIPIENTS_FIELD, HttpStatus.BAD_REQUEST, "Uno o más apoderados no existen");
        List<UserEntity> resolved = selected.stream().map(guardian -> users
                .findByCorreoAndOrganizationId(guardian.getEmail(), organizationId)
                .orElseThrow(() -> error(RECIPIENTS_FIELD, HttpStatus.BAD_REQUEST,
                        "El apoderado " + guardian.getNombre() + " todavía no tiene acceso"))).toList();
        if (resolved.stream().anyMatch(user -> !Objects.equals(organizationId, user.getOrganizationId())))
            throw error(RECIPIENTS_FIELD, HttpStatus.BAD_REQUEST,
                    "Uno o más destinatarios no pertenecen a la organización");
        return resolved.stream().collect(java.util.stream.Collectors.toMap(UserEntity::getId,
                user -> user, (first, second) -> first, LinkedHashMap::new)).values().stream().toList();
    }

    private UserEntity currentUser(String email) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof TenantUserDetails tenantUser) {
            return users.findById(tenantUser.getUserId()).orElseThrow(() ->
                    new DomainException(UserErrorCode.NOT_FOUND.getField(),
                            UserErrorCode.NOT_FOUND.getStatus(), "Usuario no encontrado"));
        }
        return users.findByCorreo(email).orElseThrow(() ->
                new DomainException(UserErrorCode.NOT_FOUND.getField(),
                        UserErrorCode.NOT_FOUND.getStatus(), "Usuario no encontrado"));
    }

    private NotificationResponse response(UserNotificationEntity row) {
        NotificationEntity value = row.getNotification();
        UserEntity sender = value.getCreatedBy();
        return new NotificationResponse(row.getId(), value.getTitle(), value.getMessage(),
                value.getType(), row.isRead(), row.getReadAt(), row.getCreatedAt(), sender.getId(),
                sender.getNombre(), sender.getProfileImageType().name(), sender.getProfileImageUrl());
    }

    private DomainException error(String field, HttpStatus status, String message) {
        return new DomainException(field, status, message);
    }
}
