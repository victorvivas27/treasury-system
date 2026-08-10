ALTER TABLE event_stand_products ADD COLUMN presentation VARCHAR(80);
ALTER TABLE event_stand_products ADD COLUMN unit_equivalence NUMERIC(10, 4);

ALTER TABLE event_stand_sale_items ADD COLUMN presentation VARCHAR(80);
ALTER TABLE event_stand_sale_items ADD COLUMN unit_equivalence NUMERIC(10, 4);
