package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationReplyJpaRepository extends JpaRepository<NotificationReplyEntity, Long> {
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from NotificationReplyEntity reply "
            + "where reply.delivery.notification.id = :notificationId")
    void deleteAllByNotificationId(@Param("notificationId") Long notificationId);

    @Query("select reply from NotificationReplyEntity reply "
            + "where reply.delivery.user.id = :recipientId "
            + "and reply.delivery.notification.createdBy.id = :creatorId "
            + "order by reply.createdAt asc")
    List<NotificationReplyEntity> findConversation(@Param("recipientId") Long recipientId,
            @Param("creatorId") Long creatorId);

    @Query("select count(reply) from NotificationReplyEntity reply where reply.read = false "
            + "and reply.author.id <> :userId and (reply.delivery.user.id = :userId "
            + "or reply.delivery.notification.createdBy.id = :userId)")
    long countUnreadReceived(@Param("userId") Long userId);

    @Query("select reply from NotificationReplyEntity reply where reply.read = false "
            + "and reply.author.id <> :userId and (reply.delivery.user.id = :userId "
            + "or reply.delivery.notification.createdBy.id = :userId)")
    List<NotificationReplyEntity> findUnreadReceived(@Param("userId") Long userId);
}
