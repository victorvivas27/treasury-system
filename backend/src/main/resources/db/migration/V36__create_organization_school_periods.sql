CREATE TABLE organization_school_periods (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    school_year INTEGER NOT NULL,
    course_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_school_period_organization
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT uk_school_period_organization_year
        UNIQUE (organization_id, school_year),
    CONSTRAINT ck_school_period_year CHECK (school_year BETWEEN 2000 AND 2100)
);

INSERT INTO organization_school_periods (organization_id, school_year, course_name)
SELECT id, school_year, COALESCE(course_name, name)
FROM organizations
WHERE type = 'COURSE'
ON CONFLICT (organization_id, school_year) DO NOTHING;

CREATE INDEX idx_school_period_organization_year
    ON organization_school_periods (organization_id, school_year DESC);
