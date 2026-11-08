CREATE TABLE collection_campaigns (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    school_year INTEGER NOT NULL CHECK (school_year BETWEEN 2026 AND 2035),
    title VARCHAR(120) NOT NULL,
    default_amount NUMERIC(14,0) NOT NULL CHECK (default_amount > 0),
    due_date DATE,
    created_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    income_id BIGINT UNIQUE REFERENCES treasury_incomes(id)
);
CREATE INDEX idx_collection_organization_year ON collection_campaigns(organization_id, school_year);
CREATE TABLE collection_participants (
    campaign_id BIGINT NOT NULL REFERENCES collection_campaigns(id) ON DELETE CASCADE,
    family_id BIGINT NOT NULL REFERENCES familias(familia_id),
    family_code VARCHAR(30), student_name VARCHAR(150), guardian VARCHAR(150), course VARCHAR(80),
    expected_amount NUMERIC(14,0) NOT NULL CHECK (expected_amount >= 0),
    PRIMARY KEY (campaign_id, family_id)
);
CREATE TABLE collection_movements (
    campaign_id BIGINT NOT NULL REFERENCES collection_campaigns(id) ON DELETE CASCADE,
    request_id VARCHAR(36) NOT NULL,
    family_id BIGINT REFERENCES familias(familia_id),
    income_id BIGINT REFERENCES treasury_incomes(id),
    expense_id BIGINT REFERENCES treasury_expenses(id),
    amount NUMERIC(14,0) NOT NULL CHECK (amount > 0),
    movement_date DATE NOT NULL, reference VARCHAR(100), recipient VARCHAR(150), cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (campaign_id, request_id),
    UNIQUE (income_id), UNIQUE (expense_id),
    CHECK ((family_id IS NOT NULL AND income_id IS NULL AND expense_id IS NULL)
        OR (family_id IS NULL AND income_id IS NOT NULL AND expense_id IS NULL)
        OR (family_id IS NULL AND expense_id IS NOT NULL AND income_id IS NULL))
);
