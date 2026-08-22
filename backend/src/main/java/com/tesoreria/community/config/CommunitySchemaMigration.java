package com.tesoreria.community.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class CommunitySchemaMigration implements ApplicationRunner {
    private static final String ALTER_ABOUT_SECTIONS = "ALTER TABLE about_sections ";
    private final JdbcTemplate jdbcTemplate;

    public CommunitySchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS course_photos ("
                + "id BIGSERIAL PRIMARY KEY, original_name VARCHAR(255) NOT NULL, "
                + "storage_object_name VARCHAR(500) NOT NULL UNIQUE, content_type VARCHAR(80) NOT NULL, "
                + "caption VARCHAR(160), display_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL)");
        jdbcTemplate.execute(ALTER_ABOUT_SECTIONS
                + "ADD COLUMN IF NOT EXISTS icon VARCHAR(30) DEFAULT 'USERS'");
        jdbcTemplate.execute(ALTER_ABOUT_SECTIONS
                + "ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT 'TURQUOISE'");
        jdbcTemplate.execute(ALTER_ABOUT_SECTIONS
                + "ADD COLUMN IF NOT EXISTS highlighted_phrase VARCHAR(240)");
        jdbcTemplate.execute(ALTER_ABOUT_SECTIONS
                + "ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE");
        jdbcTemplate.update("UPDATE about_sections SET icon = 'USERS' WHERE icon IS NULL");
        jdbcTemplate.update("UPDATE about_sections SET accent_color = 'TURQUOISE' "
                + "WHERE accent_color IS NULL");
        jdbcTemplate.update("UPDATE about_sections SET featured = FALSE WHERE featured IS NULL");
    }
}
