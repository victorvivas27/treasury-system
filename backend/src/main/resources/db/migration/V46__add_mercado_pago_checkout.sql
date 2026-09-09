ALTER TABLE payments ADD COLUMN checkout_preference_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN checkout_url VARCHAR(1000);
ALTER TABLE payments ADD COLUMN provider_payment_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN provider_status VARCHAR(50);
CREATE UNIQUE INDEX uq_payments_external_reference ON payments(external_reference);
CREATE UNIQUE INDEX uq_payments_provider_id ON payments(provider_payment_id);
