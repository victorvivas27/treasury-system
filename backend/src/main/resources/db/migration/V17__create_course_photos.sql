CREATE TABLE course_photos (
    id BIGSERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    storage_object_name VARCHAR(500) NOT NULL UNIQUE,
    content_type VARCHAR(80) NOT NULL,
    caption VARCHAR(160),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_course_photos_display_order
    ON course_photos (display_order, id);
