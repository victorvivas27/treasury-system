ALTER TABLE notification_replies
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

UPDATE notification_replies
SET is_read = FALSE
WHERE is_read IS NULL;

ALTER TABLE notification_replies
    ALTER COLUMN is_read SET DEFAULT FALSE,
    ALTER COLUMN is_read SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_replies_read
    ON notification_replies (is_read);
