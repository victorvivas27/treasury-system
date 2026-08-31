ALTER TABLE user_tokens
    ADD COLUMN IF NOT EXISTS token_family_id UUID,
    ADD COLUMN IF NOT EXISTS csrf_token_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

UPDATE user_tokens
SET token_family_id = (
    substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
    substr(md5(random()::text || clock_timestamp()::text), 9, 4) || '-' ||
    substr(md5(random()::text || clock_timestamp()::text), 13, 4) || '-' ||
    substr(md5(random()::text || clock_timestamp()::text), 17, 4) || '-' ||
    substr(md5(random()::text || clock_timestamp()::text), 21, 12)
)::uuid
WHERE type = 'REFRESH_TOKEN' AND token_family_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_tokens_family_type
    ON user_tokens (token_family_id, type);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_type_revoked
    ON user_tokens (user_id, type, revoked_at);
