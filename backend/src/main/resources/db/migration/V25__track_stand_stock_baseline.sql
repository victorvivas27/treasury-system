ALTER TABLE event_stand_products ADD COLUMN stock_set_at TIMESTAMP;

UPDATE event_stand_products
SET stock_set_at = CURRENT_TIMESTAMP
WHERE current_stock IS NOT NULL;
