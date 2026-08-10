ALTER TABLE event_stands
    ADD COLUMN transfer_commission NUMERIC(7, 4) NOT NULL DEFAULT 0;

ALTER TABLE event_stands
    ALTER COLUMN transfer_commission DROP DEFAULT;
