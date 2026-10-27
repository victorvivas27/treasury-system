-- Optional email verification. Existing TOTP factors and account roles stay unchanged.
ALTER TABLE user_mfa_state ADD COLUMN email_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_mfa_state ADD COLUMN email_sends INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_mfa_state ADD COLUMN email_window_start TIMESTAMP;
ALTER TABLE user_mfa_state ADD COLUMN last_email_sent_at TIMESTAMP;
ALTER TABLE mfa_challenges ADD COLUMN method VARCHAR(16) NOT NULL DEFAULT 'TOTP';
ALTER TABLE mfa_challenges ADD COLUMN email_code_hash VARCHAR(255);
