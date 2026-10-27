DROP TABLE IF EXISTS guardian_whatsapp_invitations;
ALTER TABLE user_tokens DROP COLUMN IF EXISTS invitation_channel;
