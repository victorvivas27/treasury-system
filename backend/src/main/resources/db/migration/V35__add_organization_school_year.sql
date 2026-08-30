ALTER TABLE organizations ADD COLUMN IF NOT EXISTS school_year INTEGER;

UPDATE organizations
SET school_year = EXTRACT(YEAR FROM created_at)::INTEGER
WHERE school_year IS NULL;

UPDATE organizations
SET course_name = name
WHERE type = 'COURSE' AND course_name IS NULL;

ALTER TABLE organizations ALTER COLUMN school_year SET NOT NULL;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS ck_organizations_school_year;
ALTER TABLE organizations ADD CONSTRAINT ck_organizations_school_year
    CHECK (school_year BETWEEN 2000 AND 2100);
