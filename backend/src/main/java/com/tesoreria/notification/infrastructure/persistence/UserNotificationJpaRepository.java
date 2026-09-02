package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserNotificationJpaRepository extends JpaRepository<UserNotificationEntity, Long> {
    List<UserNotificationEntity> findByUserIdAndVisibleTrueOrderByCreatedAtDesc(Long userId);
    List<UserNotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalseAndVisibleTrue(Long userId);
    long countByUserIdAndReadFalse(Long userId);
    Optional<UserNotificationEntity> findByIdAndUserIdAndVisibleTrue(Long id, Long userId);
    Optional<UserNotificationEntity> findByIdAndUserId(Long id, Long userId);
    Optional<UserNotificationEntity> findByIdAndNotificationCreatedById(Long id, Long creatorId);
    List<UserNotificationEntity> findByUserIdAndReadFalse(Long userId);
    List<UserNotificationEntity> findByUserIdAndReadFalseAndVisibleTrue(Long userId);
    List<UserNotificationEntity> findByNotificationIdOrderByUserNombreAsc(Long notificationId);
    @Query("select row from UserNotificationEntity row join fetch row.user "
            + "where row.notification.id in :notificationIds "
            + "order by row.notification.id asc, row.user.nombre asc")
    List<UserNotificationEntity> findByNotificationIdInWithUserOrderByNotificationAndUserName(
            @Param("notificationIds") Collection<Long> notificationIds);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from UserNotificationEntity row where row.notification.id = :notificationId")
    void deleteAllByNotificationId(@Param("notificationId") Long notificationId);
}
