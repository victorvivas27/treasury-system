ALTER TABLE event_stand_products
    ALTER COLUMN current_stock TYPE NUMERIC(14, 4)
    USING current_stock::NUMERIC(14, 4);
