ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_email;
ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_codigo;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = current_schema()
          AND t.relname = 'apoderados'
          AND c.contype = 'u'
          AND (
              SELECT array_agg(a.attname ORDER BY cols.ordinality)
              FROM unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ordinality)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = cols.attnum
          ) IN (ARRAY['email']::name[], ARRAY['codigo']::name[])
    LOOP
        EXECUTE format('ALTER TABLE apoderados DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_organization_email;
ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_organization_codigo;

ALTER TABLE apoderados ADD CONSTRAINT uk_apoderados_organization_email
    UNIQUE (organization_id, email);

ALTER TABLE apoderados ADD CONSTRAINT uk_apoderados_organization_codigo
    UNIQUE (organization_id, codigo);
