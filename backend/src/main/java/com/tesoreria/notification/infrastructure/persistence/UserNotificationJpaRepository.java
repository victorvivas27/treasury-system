package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserNotificationJpaRepository extends JpaRepository<UserNotificationEntity, Long> {
    List<UserNotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);
    Optional<UserNotificationEntity> findByIdAndUserId(Long id, Long userId);
    List<UserNotificationEntity> findByUserIdAndReadFalse(Long userId);
    List<UserNotificationEntity> findByNotificationIdOrderByUserNombreAsc(Long notificationId);
}
