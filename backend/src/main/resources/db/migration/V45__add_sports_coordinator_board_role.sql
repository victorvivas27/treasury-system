ALTER TABLE course_board_members ALTER COLUMN role TYPE VARCHAR(32);

ALTER TABLE course_board_members DROP CONSTRAINT IF EXISTS chk_board_role;
ALTER TABLE course_board_members ADD CONSTRAINT chk_board_role
    CHECK (role IN ('PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIA', 'TESORERO', 'PASTORAL',
                    'COORDINADOR_DEPORTIVO'));
