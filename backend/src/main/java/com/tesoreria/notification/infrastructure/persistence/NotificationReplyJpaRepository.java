package com.tesoreria.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface NotificationReplyJpaRepository extends JpaRepository<NotificationReplyEntity, Long> {
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from NotificationReplyEntity reply "
            + "where reply.delivery.notification.id = :notificationId")
    void deleteAllByNotificationId(@Param("notificationId") Long notificationId);

    @Query(value = "select reply.* from notification_replies reply "
            + "join user_notifications delivery on delivery.id = reply.user_notification_id "
            + "join notifications notification on notification.id = delivery.notification_id "
            + "where delivery.user_id = :recipientId and notification.created_by = :creatorId "
            + "and not exists (select 1 from notification_reply_hidden_users hidden "
            + "where hidden.reply_id = reply.id and hidden.user_id = :viewerId) "
            + "order by reply.created_at asc", nativeQuery = true)
    List<NotificationReplyEntity> findConversation(@Param("recipientId") Long recipientId,
            @Param("creatorId") Long creatorId, @Param("viewerId") Long viewerId);

    @Modifying
    @Query(value = "insert into notification_reply_hidden_users (reply_id, user_id) "
            + "values (:replyId, :userId) on conflict do nothing", nativeQuery = true)
    void hideForUser(@Param("replyId") Long replyId, @Param("userId") Long userId);

    @Query("select count(reply) from NotificationReplyEntity reply where reply.read = false "
            + "and reply.author.id <> :userId and (reply.delivery.user.id = :userId "
            + "or reply.delivery.notification.createdBy.id = :userId)")
    long countUnreadReceived(@Param("userId") Long userId);

    @Query("select reply from NotificationReplyEntity reply where reply.read = false "
            + "and reply.author.id <> :userId and (reply.delivery.user.id = :userId "
            + "or reply.delivery.notification.createdBy.id = :userId)")
    List<NotificationReplyEntity> findUnreadReceived(@Param("userId") Long userId);
    Optional<NotificationReplyEntity> findByIdAndAuthorCorreo(Long id, String correo);
}
