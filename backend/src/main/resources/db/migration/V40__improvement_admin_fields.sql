ALTER TABLE improvement_suggestions
    ADD COLUMN internal_priority VARCHAR(40) NOT NULL DEFAULT 'MEDIUM';

CREATE TABLE improvement_suggestion_notes (
    id BIGSERIAL PRIMARY KEY,
    suggestion_id BIGINT NOT NULL REFERENCES improvement_suggestions(id) ON DELETE CASCADE,
    author_user_id BIGINT NOT NULL REFERENCES users(id),
    content VARCHAR(1200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE improvement_suggestion_history (
    id BIGSERIAL PRIMARY KEY,
    suggestion_id BIGINT NOT NULL REFERENCES improvement_suggestions(id) ON DELETE CASCADE,
    changed_by_user_id BIGINT NOT NULL REFERENCES users(id),
    field_name VARCHAR(40) NOT NULL,
    old_value VARCHAR(80),
    new_value VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE improvement_suggestion_relations (
    suggestion_id BIGINT NOT NULL REFERENCES improvement_suggestions(id) ON DELETE CASCADE,
    related_suggestion_id BIGINT NOT NULL REFERENCES improvement_suggestions(id) ON DELETE CASCADE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (suggestion_id, related_suggestion_id),
    CONSTRAINT chk_improvement_relation_distinct CHECK (suggestion_id <> related_suggestion_id)
);

CREATE INDEX idx_improvement_suggestions_priority
    ON improvement_suggestions(internal_priority);

CREATE INDEX idx_improvement_suggestion_notes_suggestion_created
    ON improvement_suggestion_notes(suggestion_id, created_at DESC);

CREATE INDEX idx_improvement_suggestion_history_suggestion_created
    ON improvement_suggestion_history(suggestion_id, created_at DESC);
