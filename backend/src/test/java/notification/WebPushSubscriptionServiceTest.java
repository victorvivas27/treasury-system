package notification;

import com.tesoreria.notification.application.WebPushSubscriptionService;
import com.tesoreria.notification.config.WebPushProperties;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionEntity;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionJpaRepository;
import com.tesoreria.notification.infrastructure.web.WebPushSubscriptionRequest;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebPushSubscriptionServiceTest {
    @Mock private WebPushSubscriptionJpaRepository subscriptions;
    @Mock private UserJpaRepository users;

    @Test
    void subscribe_deberiaGuardarLaSuscripcionParaElUsuarioAutenticado() {
        WebPushSubscriptionService service = configuredService();
        UserEntity user = new UserEntity();
        user.setId(8L);
        user.setCorreo("user@mail.com");
        when(users.findByCorreo("user@mail.com")).thenReturn(Optional.of(user));
        when(subscriptions.findByEndpoint("https://push.example.com/subscription"))
                .thenReturn(Optional.empty());

        service.subscribe(new WebPushSubscriptionRequest(
                "https://push.example.com/subscription", "public-key", "auth-key"),
                "user@mail.com");

        ArgumentCaptor<WebPushSubscriptionEntity> saved = ArgumentCaptor.forClass(
                WebPushSubscriptionEntity.class);
        verify(subscriptions).save(saved.capture());
        assertAll(
                () -> assertSame(user, saved.getValue().getUser()),
                () -> assertEquals("public-key", saved.getValue().getP256dh()),
                () -> assertEquals("auth-key", saved.getValue().getAuth()),
                () -> assertNotNull(saved.getValue().getCreatedAt()),
                () -> assertNotNull(saved.getValue().getUpdatedAt()));
    }

    @Test
    void subscribe_deberiaRechazarEndpointsQueNoSeanHttps() {
        WebPushSubscriptionService service = configuredService();
        WebPushSubscriptionRequest request = new WebPushSubscriptionRequest(
                "http://localhost/push", "public-key", "auth-key");

        assertThrows(DomainException.class, () -> service.subscribe(request, "user@mail.com"));
        verifyNoInteractions(users, subscriptions);
    }

    @Test
    void availability_deberiaOcultarLaClaveSiWebPushEstaDeshabilitado() {
        WebPushSubscriptionService service = new WebPushSubscriptionService(subscriptions, users,
                new WebPushProperties(false, "public", "private", "mailto:test@example.com"));

        var availability = service.availability();

        assertFalse(availability.enabled());
        assertEquals("", availability.publicKey());
    }

    private WebPushSubscriptionService configuredService() {
        return new WebPushSubscriptionService(subscriptions, users,
                new WebPushProperties(true, "public", "private", "mailto:test@example.com"));
    }
}
