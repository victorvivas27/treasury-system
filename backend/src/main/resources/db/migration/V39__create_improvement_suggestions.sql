CREATE TABLE improvement_suggestions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    organization_id BIGINT REFERENCES organizations(id),
    category VARCHAR(40) NOT NULL,
    selected_items TEXT,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    user_impact VARCHAR(40) NOT NULL,
    screenshot_object_name VARCHAR(500),
    screenshot_content_type VARCHAR(80),
    source_route VARCHAR(300) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'RECEIVED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_improvement_suggestions_user_created
    ON improvement_suggestions(user_id, created_at DESC);

CREATE INDEX idx_improvement_suggestions_org_status
    ON improvement_suggestions(organization_id, status);
