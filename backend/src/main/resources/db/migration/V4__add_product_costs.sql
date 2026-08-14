ALTER TABLE event_stand_products
    ADD COLUMN unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE event_stand_sale_items
    ADD COLUMN unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE event_stand_sale_items
    ADD COLUMN cost_subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE event_stand_products
    ALTER COLUMN unit_cost DROP DEFAULT;
ALTER TABLE event_stand_sale_items
    ALTER COLUMN unit_cost DROP DEFAULT;
ALTER TABLE event_stand_sale_items
    ALTER COLUMN cost_subtotal DROP DEFAULT;
