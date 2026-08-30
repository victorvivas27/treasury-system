ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reply_to_email VARCHAR(150);

UPDATE organizations
SET sender_name = name
WHERE sender_name IS NULL;
