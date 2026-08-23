ALTER TABLE fee_obligations
    DROP CONSTRAINT IF EXISTS fee_obligations_status_check;

ALTER TABLE fee_obligations
    DROP CONSTRAINT IF EXISTS chk_fee_obligation_status;

ALTER TABLE fee_obligations
    ADD CONSTRAINT chk_fee_obligation_status
        CHECK (status IN ('PENDIENTE', 'EN_REVISION', 'PAGADA'));
