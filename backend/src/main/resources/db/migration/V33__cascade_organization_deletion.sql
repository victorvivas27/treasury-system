-- Deleting an organization is an explicit SUPER_ADMIN operation. Every tenant-owned
-- row must disappear in the same database transaction.
DO $$
DECLARE
    organization_fk RECORD;
BEGIN
    FOR organization_fk IN
        SELECT conrelid::regclass AS table_name, conname,
               pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'organizations'::regclass
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',
                       organization_fk.table_name, organization_fk.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON DELETE CASCADE',
                       organization_fk.table_name, organization_fk.conname,
                       organization_fk.definition);
    END LOOP;
END $$;

-- These relationships sit below tenant-owned rows and previously used RESTRICT.
-- Cascading them prevents a child record from blocking the organization deletion.
ALTER TABLE familia_apoderados DROP CONSTRAINT IF EXISTS fk_familia_apoderados_familia;
ALTER TABLE familia_apoderados ADD CONSTRAINT fk_familia_apoderados_familia
    FOREIGN KEY (familia_id) REFERENCES familias (familia_id) ON DELETE CASCADE;

ALTER TABLE school_event_participants DROP CONSTRAINT IF EXISTS fk_event_participant_event;
ALTER TABLE school_event_participants ADD CONSTRAINT fk_event_participant_event
    FOREIGN KEY (event_id) REFERENCES school_events (id) ON DELETE CASCADE;

ALTER TABLE school_event_expenses DROP CONSTRAINT IF EXISTS fk_event_expense_event;
ALTER TABLE school_event_expenses ADD CONSTRAINT fk_event_expense_event
    FOREIGN KEY (event_id) REFERENCES school_events (id) ON DELETE CASCADE;

ALTER TABLE event_stands DROP CONSTRAINT IF EXISTS fk_event_stand_event;
ALTER TABLE event_stands ADD CONSTRAINT fk_event_stand_event
    FOREIGN KEY (event_id) REFERENCES school_events (id) ON DELETE CASCADE;

ALTER TABLE event_stand_payment_methods DROP CONSTRAINT IF EXISTS fk_stand_payment_method_stand;
ALTER TABLE event_stand_payment_methods ADD CONSTRAINT fk_stand_payment_method_stand
    FOREIGN KEY (stand_id) REFERENCES event_stands (id) ON DELETE CASCADE;

ALTER TABLE event_stand_products DROP CONSTRAINT IF EXISTS fk_stand_product_stand;
ALTER TABLE event_stand_products ADD CONSTRAINT fk_stand_product_stand
    FOREIGN KEY (stand_id) REFERENCES event_stands (id) ON DELETE CASCADE;

ALTER TABLE event_stand_sales DROP CONSTRAINT IF EXISTS fk_stand_sale_stand;
ALTER TABLE event_stand_sales ADD CONSTRAINT fk_stand_sale_stand
    FOREIGN KEY (stand_id) REFERENCES event_stands (id) ON DELETE CASCADE;

ALTER TABLE event_stand_sale_items DROP CONSTRAINT IF EXISTS fk_stand_sale_item_sale;
ALTER TABLE event_stand_sale_items ADD CONSTRAINT fk_stand_sale_item_sale
    FOREIGN KEY (sale_id) REFERENCES event_stand_sales (id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_creator;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_creator
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE course_board_members DROP CONSTRAINT IF EXISTS fk_board_apoderado;
ALTER TABLE course_board_members ADD CONSTRAINT fk_board_apoderado
    FOREIGN KEY (apoderado_id) REFERENCES apoderados (apoderado_id) ON DELETE CASCADE;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_installment_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_installment_id_fkey
    FOREIGN KEY (installment_id) REFERENCES fee_obligations (id) ON DELETE CASCADE;

ALTER TABLE bank_transfer_payments DROP CONSTRAINT IF EXISTS bank_transfer_payments_payment_id_fkey;
ALTER TABLE bank_transfer_payments ADD CONSTRAINT bank_transfer_payments_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE;
