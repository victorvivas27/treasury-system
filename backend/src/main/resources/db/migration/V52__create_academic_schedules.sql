CREATE TABLE academic_schedules (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL,
    draft_json TEXT NOT NULL,
    published_json TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_schedule_organization_period UNIQUE (organization_id, period_id)
);
ALTER TABLE organization_school_periods
    ADD CONSTRAINT uk_school_period_id_organization UNIQUE (id, organization_id);
ALTER TABLE academic_schedules
    ADD CONSTRAINT fk_schedule_period FOREIGN KEY (period_id, organization_id)
    REFERENCES organization_school_periods(id, organization_id) ON DELETE CASCADE;
