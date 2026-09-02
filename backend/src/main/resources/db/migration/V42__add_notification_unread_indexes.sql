CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread_visible
    ON user_notifications (user_id, is_read, is_visible);

CREATE INDEX IF NOT EXISTS idx_notification_replies_unread_author_delivery
    ON notification_replies (is_read, author_id, user_notification_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_by
    ON notifications (created_by);

CREATE INDEX IF NOT EXISTS idx_alumnos_active_birth_date
    ON alumnos (activo, fecha_nacimiento);
