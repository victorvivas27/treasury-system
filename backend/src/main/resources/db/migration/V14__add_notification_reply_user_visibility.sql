CREATE TABLE IF NOT EXISTS notification_reply_hidden_users (
    reply_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    hidden_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reply_id, user_id),
    CONSTRAINT fk_reply_hidden_reply FOREIGN KEY (reply_id)
        REFERENCES notification_replies (id) ON DELETE CASCADE,
    CONSTRAINT fk_reply_hidden_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reply_hidden_user
    ON notification_reply_hidden_users (user_id);
