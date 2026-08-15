package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByCreatedByCorreoOrderByCreatedAtDesc(String correo);
}
