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
    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(notifications, deliveries, replies, users, guardians);
    }

    @Test
    void unreadCount_deberiaSumarNotificacionesYRespuestasRecibidas() {
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
        when(deliveries.findByIdAndUserIdAndVisibleTrue(12L, 7L)).thenReturn(Optional.of(delivery));
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
    void reply_deberiaImpedirQueOtroAdministradorAccedaAlHilo() {
        UserEntity admin = user(2L, "Otro admin", "other@mail.com", RoleEnum.ADMIN);
        when(users.findByCorreo(admin.getCorreo())).thenReturn(Optional.of(admin));
        when(deliveries.findByIdAndNotificationCreatedById(12L, 2L)).thenReturn(Optional.empty());

        assertThrows(DomainException.class, () -> service.reply(12L,
                new NotificationReplyRequest("Mensaje"), admin.getCorreo()));
        verify(replies, never()).save(any());
    }

    @Test
    void deleteSent_deberiaEliminarRespuestasEntregasYNotificacionEnOrden() {
        NotificationEntity notification = mock(NotificationEntity.class);
        when(notification.getId()).thenReturn(15L);
        when(notifications.findByIdAndCreatedByCorreo(15L, "admin@mail.com"))
                .thenReturn(Optional.of(notification));

        service.deleteSent(15L, "admin@mail.com");

        var ordered = inOrder(replies, deliveries, notifications);
        ordered.verify(replies).deleteAllByNotificationId(15L);
        ordered.verify(deliveries).deleteAllByNotificationId(15L);
        ordered.verify(notifications).deleteById(15L);
        ordered.verify(notifications).flush();
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
