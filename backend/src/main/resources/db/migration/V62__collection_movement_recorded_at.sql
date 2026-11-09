-- Historical movements retain NULL: their registration time was never recorded.
ALTER TABLE collection_movements ADD COLUMN recorded_at TIMESTAMP WITH TIME ZONE;
