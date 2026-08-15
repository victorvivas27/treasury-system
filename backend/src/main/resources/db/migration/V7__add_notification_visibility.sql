ALTER TABLE user_notifications
    ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_user_notifications_user_visible
    ON user_notifications (user_id, is_visible);
