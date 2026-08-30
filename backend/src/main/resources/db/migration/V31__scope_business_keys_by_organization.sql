ALTER TABLE organizations ADD COLUMN IF NOT EXISTS course_name VARCHAR(80);

UPDATE organizations
SET course_name = (
    SELECT setting_value FROM treasury_settings WHERE setting_key = 'MANAGED_COURSE'
)
WHERE slug = 'default' AND course_name IS NULL;

ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS uk_alumnos_codigo;
ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS uk_alumnos_organization_codigo;
ALTER TABLE alumnos ADD CONSTRAINT uk_alumnos_organization_codigo
    UNIQUE (organization_id, codigo);

ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_codigo;
ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_email;
ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_organization_codigo;
ALTER TABLE apoderados DROP CONSTRAINT IF EXISTS uk_apoderados_organization_email;
ALTER TABLE apoderados ADD CONSTRAINT uk_apoderados_organization_codigo
    UNIQUE (organization_id, codigo);
ALTER TABLE apoderados ADD CONSTRAINT uk_apoderados_organization_email
    UNIQUE (organization_id, email);

ALTER TABLE annual_fee_configs DROP CONSTRAINT IF EXISTS uk_annual_fee_year;
ALTER TABLE annual_fee_configs DROP CONSTRAINT IF EXISTS uk_annual_fee_organization_year;
ALTER TABLE annual_fee_configs ADD CONSTRAINT uk_annual_fee_organization_year
    UNIQUE (organization_id, fee_year);

ALTER TABLE contribution_configs DROP CONSTRAINT IF EXISTS uk_contribution_config_year_type;
ALTER TABLE contribution_configs DROP CONSTRAINT IF EXISTS uk_contribution_config_organization_year_type;
ALTER TABLE contribution_configs ADD CONSTRAINT uk_contribution_config_organization_year_type
    UNIQUE (organization_id, school_year, contribution_type);

ALTER TABLE school_events DROP CONSTRAINT IF EXISTS uk_school_event_name;
ALTER TABLE school_events DROP CONSTRAINT IF EXISTS uk_school_event_organization_name;
ALTER TABLE school_events ADD CONSTRAINT uk_school_event_organization_name
    UNIQUE (organization_id, name);

ALTER TABLE bank_account_settings DROP CONSTRAINT IF EXISTS bank_account_settings_school_year_key;
ALTER TABLE bank_account_settings DROP CONSTRAINT IF EXISTS uk_bank_account_organization_year;
ALTER TABLE bank_account_settings ADD CONSTRAINT uk_bank_account_organization_year
    UNIQUE (organization_id, school_year);

ALTER TABLE course_board_members DROP CONSTRAINT IF EXISTS uq_board_position;
ALTER TABLE course_board_members DROP CONSTRAINT IF EXISTS uq_board_parent;
ALTER TABLE course_board_members DROP CONSTRAINT IF EXISTS uq_board_organization_position;
ALTER TABLE course_board_members DROP CONSTRAINT IF EXISTS uq_board_organization_parent;
ALTER TABLE course_board_members ADD CONSTRAINT uq_board_organization_position
    UNIQUE (organization_id, election_year, role, position_number);
ALTER TABLE course_board_members ADD CONSTRAINT uq_board_organization_parent
    UNIQUE (organization_id, election_year, apoderado_id);
