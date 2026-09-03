ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_users_correo;
ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_users_organization_correo;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = current_schema()
      AND t.relname = 'users'
      AND c.contype = 'u'
      AND (
          SELECT array_agg(a.attname ORDER BY cols.ordinality)
          FROM unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ordinality)
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = cols.attnum
      ) = ARRAY['correo']::name[]
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT uk_users_organization_correo
    UNIQUE (organization_id, correo);
