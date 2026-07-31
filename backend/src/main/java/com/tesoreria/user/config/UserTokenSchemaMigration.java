package com.tesoreria.user.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate update does not replace existing PostgreSQL enum check constraints
 * when a Java enum receives a new value.
 */
@Component
@Profile("dev")
public class UserTokenSchemaMigration implements ApplicationRunner {
  private final JdbcTemplate jdbc;

  public UserTokenSchemaMigration(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) {
    jdbc.execute("""
        ALTER TABLE user_tokens
        DROP CONSTRAINT IF EXISTS user_tokens_type_check
        """);
    jdbc.execute("""
        ALTER TABLE user_tokens
        ADD CONSTRAINT user_tokens_type_check
        CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'ACCOUNT_INVITATION'))
        """);
  }
}
