package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WebPushSubscriptionJpaRepository
        extends JpaRepository<WebPushSubscriptionEntity, Long> {
    Optional<WebPushSubscriptionEntity> findByEndpoint(String endpoint);
    void deleteByEndpointAndUserCorreo(String endpoint, String correo);
    void deleteByEndpointAndUserId(String endpoint, Long userId);

    @EntityGraph(attributePaths = "user")
    List<WebPushSubscriptionEntity> findByUserCorreoIn(Collection<String> correos);

    @EntityGraph(attributePaths = "user")
    List<WebPushSubscriptionEntity> findByUserIdIn(Collection<Long> userIds);
}
