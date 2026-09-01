ALTER TABLE family_fee_plans
    DROP CONSTRAINT IF EXISTS family_fee_plans_mode_check;

ALTER TABLE family_fee_plans
    DROP CONSTRAINT IF EXISTS chk_family_fee_plans_mode;

ALTER TABLE family_fee_plans
    ADD CONSTRAINT chk_family_fee_plans_mode
        CHECK (mode IN ('ANUAL', 'DOS_CUOTAS', 'PERSONALIZADA'));
