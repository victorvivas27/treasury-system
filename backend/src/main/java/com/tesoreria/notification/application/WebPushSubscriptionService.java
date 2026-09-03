package com.tesoreria.notification.application;

import com.tesoreria.notification.config.WebPushProperties;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionEntity;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionJpaRepository;
import com.tesoreria.notification.infrastructure.web.WebPushSubscriptionRequest;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.time.LocalDateTime;

@Service
public class WebPushSubscriptionService {
    private final WebPushSubscriptionJpaRepository subscriptions;
    private final UserJpaRepository users;
    private final WebPushProperties properties;

    public WebPushSubscriptionService(WebPushSubscriptionJpaRepository subscriptions,
            UserJpaRepository users, WebPushProperties properties) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.properties = properties;
    }

    public WebPushAvailability availability() {
        return new WebPushAvailability(properties.configured(),
                properties.configured() ? properties.publicKey() : "");
    }

    @Transactional
    public void subscribe(WebPushSubscriptionRequest request, String email) {
        if (!properties.configured()) throw new DomainException("push", HttpStatus.SERVICE_UNAVAILABLE,
                "Las notificaciones del dispositivo todavía no están configuradas");
        validateEndpoint(request.endpoint());
        UserEntity user = currentUser(email);
        LocalDateTime now = LocalDateTime.now();
        WebPushSubscriptionEntity subscription = subscriptions.findByEndpoint(request.endpoint())
                .orElseGet(() -> {
                    WebPushSubscriptionEntity created = new WebPushSubscriptionEntity();
                    created.setEndpoint(request.endpoint());
                    created.setCreatedAt(now);
                    return created;
                });
        subscription.setUser(user);
        subscription.setP256dh(request.p256dh());
        subscription.setAuth(request.auth());
        subscription.setUpdatedAt(now);
        subscriptions.save(subscription);
    }

    @Transactional
    public void unsubscribe(String endpoint, String email) {
        subscriptions.deleteByEndpointAndUserId(endpoint, currentUser(email).getId());
    }

    private void validateEndpoint(String value) {
        try {
            URI uri = URI.create(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                    || uri.getHost().isBlank()) throw new IllegalArgumentException();
        } catch (IllegalArgumentException exception) {
            throw new DomainException("endpoint", HttpStatus.BAD_REQUEST,
                    "La suscripción push no contiene un endpoint HTTPS válido", exception);
        }
    }

    private UserEntity currentUser(String email) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof TenantUserDetails tenantUser) {
            return users.findById(tenantUser.getUserId()).orElseThrow(() -> notFound());
        }
        return users.findByCorreo(email).orElseThrow(this::notFound);
    }

    private DomainException notFound() {
        return new DomainException(UserErrorCode.NOT_FOUND.getField(),
                UserErrorCode.NOT_FOUND.getStatus(), "Usuario no encontrado");
    }

    public record WebPushAvailability(boolean enabled, String publicKey) { }
}
