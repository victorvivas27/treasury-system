package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByCreatedByCorreoOrderByCreatedAtDesc(String correo);
    List<NotificationEntity> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);
    Optional<NotificationEntity> findByIdAndCreatedByCorreo(Long id, String correo);
    Optional<NotificationEntity> findByIdAndCreatedById(Long id, Long createdById);
}
