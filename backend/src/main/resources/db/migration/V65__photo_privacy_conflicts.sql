-- Additive: keep every uploaded original and every previous review.
ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS published_storage_object_name VARCHAR(500);
ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS active_privacy_review_id BIGINT;
ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS pending_publication_storage_object_name VARCHAR(500);
ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS pending_privacy_review_id BIGINT;

ALTER TABLE course_photo_privacy_reviews ADD COLUMN IF NOT EXISTS blur_regions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE course_photo_privacy_reviews ADD COLUMN IF NOT EXISTS absent_student_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE course_photo_privacy_reviews ADD COLUMN IF NOT EXISTS publication_storage_object_name VARCHAR(500);
ALTER TABLE course_photo_privacy_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'APPROVED';

CREATE TABLE IF NOT EXISTS course_photo_review_subjects (
    review_id BIGINT NOT NULL REFERENCES course_photo_privacy_reviews(id),
    organization_id BIGINT NOT NULL,
    photo_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    PRIMARY KEY (review_id, student_id)
);

CREATE INDEX IF NOT EXISTS ix_course_photo_active_review
    ON course_photos (organization_id, active_privacy_review_id);

CREATE TABLE IF NOT EXISTS privacy_admin_access_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    access_type VARCHAR(40) NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS ix_privacy_admin_access_org_time
    ON privacy_admin_access_events (organization_id, accessed_at DESC);

CREATE TABLE IF NOT EXISTS privacy_conflict_resolution_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    guardian_id BIGINT NOT NULL,
    purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('BIRTHDAY', 'GROUP_PHOTOS')),
    actor_user_id BIGINT NOT NULL,
    evidence_reference VARCHAR(200) NOT NULL,
    details VARCHAR(1000) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
