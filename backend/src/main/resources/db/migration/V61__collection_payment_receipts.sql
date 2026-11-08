CREATE TABLE collection_receipts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES collection_campaigns(id) ON DELETE CASCADE,
    request_id VARCHAR(36) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_object_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    UNIQUE (campaign_id, request_id)
);
CREATE INDEX idx_collection_receipts_tenant ON collection_receipts(organization_id, campaign_id);
