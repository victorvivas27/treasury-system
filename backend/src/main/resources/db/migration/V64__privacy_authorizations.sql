-- Additive only: existing photos, documents and financial records are preserved.
CREATE TABLE IF NOT EXISTS privacy_authorization_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    guardian_id BIGINT,
    student_id BIGINT,
    course VARCHAR(100),
    purpose VARCHAR(32) NOT NULL,
    granted BOOLEAN NOT NULL,
    document_version VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    evidence_reference VARCHAR(200),
    CHECK (purpose IN ('TERMS', 'BIRTHDAY', 'GROUP_PHOTOS', 'REPRESENTATION'))
);
CREATE INDEX IF NOT EXISTS ix_privacy_subject ON privacy_authorization_events
    (organization_id, student_id, purpose, id);
CREATE INDEX IF NOT EXISTS ix_privacy_actor ON privacy_authorization_events
    (organization_id, actor_user_id, purpose, id);

ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS privacy_reviewed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS course_photo_subjects (
    organization_id BIGINT NOT NULL,
    photo_id BIGINT NOT NULL REFERENCES course_photos(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES alumnos(alumno_id) ON DELETE CASCADE,
    PRIMARY KEY (organization_id, photo_id, student_id)
);

CREATE TABLE IF NOT EXISTS legal_responsibility_changes (
    id BIGSERIAL PRIMARY KEY,
    previous_change_id BIGINT REFERENCES legal_responsibility_changes(id),
    responsible_name VARCHAR(200) NOT NULL,
    responsible_type VARCHAR(16) NOT NULL CHECK (responsible_type IN ('NATURAL', 'JURIDICA')),
    legal_address VARCHAR(300) NOT NULL,
    privacy_email VARCHAR(254) NOT NULL,
    responsibility_start DATE NOT NULL,
    proposed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    proposed_by BIGINT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by BIGINT,
    review_notes VARCHAR(2000),
    status VARCHAR(24) NOT NULL CHECK (status IN ('PENDING_REVIEW', 'APPLIED', 'REJECTED'))
);
CREATE TABLE IF NOT EXISTS course_photo_privacy_reviews (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    photo_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    student_ids VARCHAR(6000) NOT NULL
);
CREATE TABLE IF NOT EXISTS legal_document_versions (
    id BIGSERIAL PRIMARY KEY,
    responsibility_change_id BIGINT NOT NULL REFERENCES legal_responsibility_changes(id),
    terms_text TEXT NOT NULL,
    privacy_text TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_by BIGINT NOT NULL,
    review_notes VARCHAR(2000) NOT NULL
);
CREATE TABLE IF NOT EXISTS treasury_document_privacy_reviews (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    document_kind VARCHAR(16) NOT NULL CHECK (document_kind IN ('INCOME', 'EXPENSE')),
    document_id BIGINT NOT NULL,
    approved BOOLEAN NOT NULL,
    actor_user_id BIGINT NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    review_notes VARCHAR(500) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_document_privacy_review ON treasury_document_privacy_reviews
    (organization_id, document_kind, document_id, id);
