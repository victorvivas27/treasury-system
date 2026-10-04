-- No historical accounts are activated or disabled by this migration.
ALTER TABLE users ADD COLUMN invitation_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN invited_guardian_id BIGINT;
ALTER TABLE user_tokens ADD COLUMN guardian_id BIGINT;
ALTER TABLE user_tokens ADD COLUMN invitation_organization_id BIGINT;
ALTER TABLE user_tokens ADD COLUMN invitation_email VARCHAR(100);

-- New invitation context must be complete. Old unbound tokens remain readable
-- but are rejected by the application and must be reissued by an administrator.
ALTER TABLE user_tokens ADD CONSTRAINT ck_invitation_context_complete CHECK (
    (guardian_id IS NULL AND invitation_organization_id IS NULL AND invitation_email IS NULL)
    OR (type = 'ACCOUNT_INVITATION' AND guardian_id IS NOT NULL
        AND invitation_organization_id IS NOT NULL AND invitation_email IS NOT NULL)
);
