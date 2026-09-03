package notification;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.notification.application.NotificationService;
import com.tesoreria.notification.infrastructure.persistence.*;
import com.tesoreria.notification.infrastructure.web.NotificationReplyRequest;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock private NotificationJpaRepository notifications;
    @Mock private UserNotificationJpaRepository deliveries;
    @Mock private NotificationReplyJpaRepository replies;
    @Mock private UserJpaRepository users;
    @Mock private ApoderadoJpaRepository guardians;
    @Mock private ApplicationEventPublisher events;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(notifications, deliveries, replies, users, guardians, events);
    }

    @Test
    void unreadCount_deberiaSumarNotificacionesYMensajesRecibidos() {
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        when(users.findByCorreo(guardian.getCorreo())).thenReturn(Optional.of(guardian));
        when(deliveries.countByUserIdAndReadFalseAndVisibleTrue(7L)).thenReturn(2L);
        when(replies.countUnreadReceived(7L)).thenReturn(3L);

        assertEquals(5L, service.unreadCount(guardian.getCorreo()));
    }

    @Test
    void sent_deberiaCargarDestinatariosEnUnaSolaConsulta() {
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        NotificationEntity first = notification(10L, "Primer aviso");
        NotificationEntity second = notification(11L, "Segundo aviso");
        UserEntity recipient = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        UserNotificationEntity firstDelivery = delivery(20L, first, recipient, false);
        UserNotificationEntity secondDelivery = delivery(21L, second, recipient, true);
        when(users.findByCorreo("admin@mail.com")).thenReturn(Optional.of(admin));
        when(notifications.findByCreatedByIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(first, second));
        when(deliveries.findByNotificationIdInWithUserOrderByNotificationAndUserName(
                argThat(ids -> ids.containsAll(List.of(10L, 11L)) && ids.size() == 2)))
                .thenReturn(List.of(firstDelivery, secondDelivery));

        var result = service.sent("admin@mail.com");

        assertEquals(2, result.size());
        assertEquals(20L, result.get(0).recipients().get(0).deliveryId());
        assertEquals(21L, result.get(1).recipients().get(0).deliveryId());
        verify(deliveries).findByNotificationIdInWithUserOrderByNotificationAndUserName(
                argThat(ids -> ids.containsAll(List.of(10L, 11L)) && ids.size() == 2));
        verify(deliveries, never()).findByNotificationIdOrderByUserNombreAsc(anyLong());
    }

    @Test
    void reply_deberiaPermitirAlApoderadoResponderSuConversacion() {
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        NotificationEntity notification = new NotificationEntity();
        notification.setCreatedBy(admin);
        UserNotificationEntity delivery = new UserNotificationEntity();
        delivery.setNotification(notification);
        delivery.setUser(guardian);
        when(users.findByCorreo(guardian.getCorreo())).thenReturn(Optional.of(guardian));
        when(deliveries.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(delivery));
        when(replies.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.reply(12L, new NotificationReplyRequest("  Recibido  "),
                guardian.getCorreo());

        assertEquals("Recibido", response.message());
        assertEquals("USER", response.authorRole());
        ArgumentCaptor<NotificationReplyEntity> saved = ArgumentCaptor.forClass(
                NotificationReplyEntity.class);
        verify(replies).save(saved.capture());
        assertFalse(saved.getValue().isRead());
        assertSame(delivery, saved.getValue().getDelivery());
    }

    @Test
    void realtimeReply_deberiaPersistirYDirigirLaRespuestaAlOtroParticipante() {
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        NotificationEntity notification = new NotificationEntity();
        notification.setCreatedBy(admin);
        UserNotificationEntity delivery = new UserNotificationEntity();
        delivery.setNotification(notification);
        delivery.setUser(guardian);
        when(users.findByCorreo(guardian.getCorreo())).thenReturn(Optional.of(guardian));
        when(deliveries.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(delivery));
        when(replies.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.realtimeReply(12L, new NotificationReplyRequest("  Gracias  "),
                guardian.getCorreo());

        assertEquals(12L, result.deliveryId());
        assertEquals("Gracias", result.reply().message());
        assertEquals(admin.getCorreo(), result.recipientEmail());
        verify(replies).save(any(NotificationReplyEntity.class));
    }

    @Test
    void startTreasuryConversation_deberiaCrearHiloConElUnicoAdministrador() {
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        UserNotificationEntity savedDelivery = mock(UserNotificationEntity.class);
        when(savedDelivery.getId()).thenReturn(40L);
        when(users.findByCorreo(guardian.getCorreo())).thenReturn(Optional.of(guardian));
        when(users.findByRolOrderByIdAsc(RoleEnum.ADMIN)).thenReturn(List.of(admin));
        when(notifications.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(deliveries.save(any())).thenReturn(savedDelivery);
        when(replies.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.startTreasuryConversation(
                new NotificationReplyRequest("  Necesito ayuda  "), guardian.getCorreo());

        assertEquals(40L, result.deliveryId());
        assertEquals("Necesito ayuda", result.reply().message());
        assertEquals(admin.getCorreo(), result.recipientEmail());
        verify(notifications).save(any(NotificationEntity.class));
        verify(deliveries).save(any(UserNotificationEntity.class));
        verify(replies).save(any(NotificationReplyEntity.class));
    }

    @Test
    void reply_deberiaImpedirQueOtroAdministradorAccedaAlHilo() {
        UserEntity admin = user(2L, "Otro admin", "other@mail.com", RoleEnum.ADMIN);
        when(users.findByCorreo(admin.getCorreo())).thenReturn(Optional.of(admin));
        when(deliveries.findByIdAndNotificationCreatedById(12L, 2L)).thenReturn(Optional.empty());

        assertThrows(DomainException.class, () -> service.reply(12L,
                new NotificationReplyRequest("Mensaje"), admin.getCorreo()));
        verify(replies, never()).save(any());
    }

    @Test
    void replies_deberiaPermitirAlSuperAdminAccederAlHiloQueCreo() {
        UserEntity superAdmin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.SUPER_ADMIN);
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        NotificationEntity notification = new NotificationEntity();
        notification.setCreatedBy(superAdmin);
        UserNotificationEntity delivery = new UserNotificationEntity();
        delivery.setNotification(notification);
        delivery.setUser(guardian);
        when(users.findByCorreo(superAdmin.getCorreo())).thenReturn(Optional.of(superAdmin));
        when(deliveries.findByIdAndNotificationCreatedById(12L, 1L))
                .thenReturn(Optional.of(delivery));
        when(replies.findConversation(7L, 1L, 1L)).thenReturn(List.of());

        assertTrue(service.replies(12L, superAdmin.getCorreo()).isEmpty());

        verify(deliveries).findByIdAndNotificationCreatedById(12L, 1L);
        verify(deliveries, never()).findByIdAndUserId(anyLong(), anyLong());
    }

    @Test
    void startTreasuryConversation_deberiaImpedirQueSuperAdminInicieComoApoderado() {
        UserEntity superAdmin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.SUPER_ADMIN);
        when(users.findByCorreo(superAdmin.getCorreo())).thenReturn(Optional.of(superAdmin));

        assertThrows(DomainException.class, () -> service.startTreasuryConversation(
                new NotificationReplyRequest("Mensaje"), superAdmin.getCorreo()));

        verify(notifications, never()).save(any());
        verify(deliveries, never()).save(any());
        verify(replies, never()).save(any());
    }

    @Test
    void treasuryContact_deberiaImpedirQueSuperAdminLoConsulteComoApoderado() {
        UserEntity superAdmin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.SUPER_ADMIN);
        when(users.findByCorreo(superAdmin.getCorreo())).thenReturn(Optional.of(superAdmin));

        assertThrows(DomainException.class, () -> service.treasuryContact(superAdmin.getCorreo()));

        verify(users, never()).findByRolOrderByIdAsc(any());
        verify(users, never()).findByRolInAndOrganizationIdOrderByIdAsc(any(), any());
    }

    @Test
    void deleteSent_deberiaEliminarMensajesEntregasYNotificacionEnOrden() {
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        NotificationEntity notification = mock(NotificationEntity.class);
        when(notification.getId()).thenReturn(18L);
        when(users.findByCorreo("admin@mail.com")).thenReturn(Optional.of(admin));
        when(notifications.findByIdAndCreatedById(18L, 1L))
                .thenReturn(Optional.of(notification));

        service.deleteSent(18L, "admin@mail.com");

        var ordered = inOrder(replies, deliveries, notifications);
        ordered.verify(replies).deleteAllByNotificationId(18L);
        ordered.verify(deliveries).deleteAllByNotificationId(18L);
        ordered.verify(notifications).deleteById(18L);
        ordered.verify(notifications).flush();
    }

    @Test
    void deleteReply_delAutorDeberiaEliminarParaAmbos() {
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        NotificationReplyEntity reply = reply(22L, guardian, admin, guardian);
        when(users.findByCorreo(guardian.getCorreo())).thenReturn(Optional.of(guardian));
        when(replies.findById(22L)).thenReturn(Optional.of(reply));

        service.deleteReply(22L, guardian.getCorreo());

        verify(replies).delete(reply);
        verify(replies, never()).hideForUser(anyLong(), anyLong());
        ArgumentCaptor<Object> deletedEvent = ArgumentCaptor.forClass(Object.class);
        verify(events).publishEvent(deletedEvent.capture());
        assertInstanceOf(com.tesoreria.notification.application.NotificationReplyDeletedEvent.class,
                deletedEvent.getValue());
    }

    @Test
    void deleteReply_delReceptorDeberiaOcultarSoloParaEl() {
        UserEntity guardian = user(7L, "Apoderado", "guardian@mail.com", RoleEnum.USER);
        UserEntity admin = user(1L, "Tesorero", "admin@mail.com", RoleEnum.ADMIN);
        NotificationReplyEntity reply = reply(22L, guardian, admin, guardian);
        when(users.findByCorreo(admin.getCorreo())).thenReturn(Optional.of(admin));
        when(replies.findById(22L)).thenReturn(Optional.of(reply));

        service.deleteReply(22L, admin.getCorreo());

        verify(replies).hideForUser(22L, 1L);
        verify(replies, never()).delete(any());
        verify(events, never()).publishEvent(any());
    }

    private NotificationReplyEntity reply(Long id, UserEntity author, UserEntity creator,
            UserEntity recipient) {
        NotificationEntity notification = new NotificationEntity();
        notification.setCreatedBy(creator);
        UserNotificationEntity delivery = new UserNotificationEntity();
        delivery.setNotification(notification);
        delivery.setUser(recipient);
        NotificationReplyEntity reply = mock(NotificationReplyEntity.class);
        when(reply.getId()).thenReturn(id);
        when(reply.getAuthor()).thenReturn(author);
        when(reply.getDelivery()).thenReturn(delivery);
        return reply;
    }

    private UserEntity user(Long id, String name, String email, RoleEnum role) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setNombre(name);
        user.setCorreo(email);
        user.setRol(role);
        return user;
    }

    private NotificationEntity notification(Long id, String title) {
        NotificationEntity notification = mock(NotificationEntity.class);
        when(notification.getId()).thenReturn(id);
        when(notification.getTitle()).thenReturn(title);
        when(notification.getMessage()).thenReturn("Mensaje");
        when(notification.getType()).thenReturn("INFO");
        return notification;
    }

    private UserNotificationEntity delivery(Long id, NotificationEntity notification,
            UserEntity recipient, boolean read) {
        UserNotificationEntity delivery = mock(UserNotificationEntity.class);
        when(delivery.getId()).thenReturn(id);
        when(delivery.getNotification()).thenReturn(notification);
        when(delivery.getUser()).thenReturn(recipient);
        when(delivery.isRead()).thenReturn(read);
        return delivery;
    }
}
