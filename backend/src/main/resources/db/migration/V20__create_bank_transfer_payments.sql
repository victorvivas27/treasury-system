CREATE TABLE bank_account_settings (
    id BIGSERIAL PRIMARY KEY,
    school_year INTEGER NOT NULL UNIQUE CHECK (school_year >= 2000),
    account_holder_name VARCHAR(120) NOT NULL,
    account_holder_rut VARCHAR(20) NOT NULL,
    bank_name VARCHAR(80) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_number VARCHAR(40) NOT NULL,
    email VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    installment_id BIGINT NOT NULL REFERENCES fee_obligations(id),
    amount NUMERIC(14, 0) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    paid_at TIMESTAMP,
    external_reference VARCHAR(150),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE bank_transfer_payments (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL UNIQUE REFERENCES payments(id),
    proof_object_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(80) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    submitted_at TIMESTAMP NOT NULL,
    reviewed_by VARCHAR(120),
    reviewed_at TIMESTAMP,
    rejection_reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_payments_installment ON payments(installment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_installment_created ON payments(installment_id, created_at DESC);
CREATE INDEX idx_bank_transfer_submitted ON bank_transfer_payments(submitted_at DESC);

