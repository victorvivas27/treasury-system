CREATE TABLE course_board_members (
    id BIGSERIAL PRIMARY KEY,
    election_year INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    position_number INTEGER NOT NULL DEFAULT 1,
    apoderado_id BIGINT NOT NULL,
    CONSTRAINT fk_board_apoderado
        FOREIGN KEY (apoderado_id) REFERENCES apoderados(apoderado_id),
    CONSTRAINT uq_board_position
        UNIQUE (election_year, role, position_number),
    CONSTRAINT uq_board_parent
        UNIQUE (election_year, apoderado_id),
    CONSTRAINT chk_board_role
        CHECK (role IN ('PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIA', 'TESORERO', 'PASTORAL')),
    CONSTRAINT chk_board_position
        CHECK ((role = 'PASTORAL' AND position_number BETWEEN 1 AND 2)
            OR (role <> 'PASTORAL' AND position_number = 1))
);

CREATE INDEX idx_course_board_year
    ON course_board_members (election_year, role, position_number);
