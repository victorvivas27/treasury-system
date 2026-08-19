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
    void reply_deberiaImpedirQueOtroAdministradorAccedaAlHilo() {
        UserEntity admin = user(2L, "Otro admin", "other@mail.com", RoleEnum.ADMIN);
        when(users.findByCorreo(admin.getCorreo())).thenReturn(Optional.of(admin));
        when(deliveries.findByIdAndNotificationCreatedById(12L, 2L)).thenReturn(Optional.empty());

        assertThrows(DomainException.class, () -> service.reply(12L,
                new NotificationReplyRequest("Mensaje"), admin.getCorreo()));
        verify(replies, never()).save(any());
    }

    @Test
    void deleteSent_deberiaEliminarMensajesEntregasYNotificacionEnOrden() {
        NotificationEntity notification = mock(NotificationEntity.class);
        when(notification.getId()).thenReturn(18L);
        when(notifications.findByIdAndCreatedByCorreo(18L, "admin@mail.com"))
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
}
