ALTER TABLE notification_replies
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
