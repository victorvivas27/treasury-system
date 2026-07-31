package com.tesoreria.treasury.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Protege los datos transaccionales de Tesorería aunque una eliminación se
 * ejecute fuera de JPA. Hibernate update no crea estas relaciones sobre tablas
 * que ya existían sin claves foráneas.
 */
@Component
@Profile("dev")
public class TreasuryDataIntegrityMigration implements ApplicationRunner {
  private final JdbcTemplate jdbc;

  public TreasuryDataIntegrityMigration(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    deleteOrphans();
    addForeignKey("fk_fee_plan_config", "family_fee_plans", "config_id",
        "annual_fee_configs", "id");
    addForeignKey("fk_fee_plan_family", "family_fee_plans", "family_id",
        "familias", "familia_id");
    addForeignKey("fk_fee_obligation_plan", "fee_obligations", "plan_id",
        "family_fee_plans", "id");
    addForeignKey("fk_fee_payment_obligation", "fee_payments", "obligation_id",
        "fee_obligations", "id");
    addForeignKey("fk_contribution_family", "family_contributions", "family_id",
        "familias", "familia_id");
    addForeignKey("fk_user_token_user", "user_tokens", "user_id", "users", "id");
  }

  private void deleteOrphans() {
    jdbc.update("""
        DELETE FROM family_fee_plans p
        WHERE NOT EXISTS (
          SELECT 1 FROM familias f WHERE f.familia_id = p.family_id
        ) OR NOT EXISTS (
          SELECT 1 FROM annual_fee_configs c WHERE c.id = p.config_id
        )
        """);
    jdbc.update("""
        DELETE FROM fee_obligations o
        WHERE NOT EXISTS (
          SELECT 1 FROM family_fee_plans p WHERE p.id = o.plan_id
        )
        """);
    jdbc.update("""
        DELETE FROM fee_payments p
        WHERE NOT EXISTS (
          SELECT 1 FROM fee_obligations o WHERE o.id = p.obligation_id
        )
        """);
    jdbc.update("""
        DELETE FROM family_contributions c
        WHERE NOT EXISTS (
          SELECT 1 FROM familias f WHERE f.familia_id = c.family_id
        )
        """);
    jdbc.update("""
        DELETE FROM user_tokens t
        WHERE t.used_at IS NOT NULL
           OR t.expires_at < CURRENT_TIMESTAMP
           OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)
        """);
  }

  private void addForeignKey(String name, String table, String column,
                             String referencedTable, String referencedColumn) {
    Integer exists = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM information_schema.table_constraints
        WHERE table_schema = current_schema()
          AND constraint_name = ?
          AND constraint_type = 'FOREIGN KEY'
        """, Integer.class, name);
    if (exists != null && exists > 0) return;
    jdbc.execute("ALTER TABLE " + table
        + " ADD CONSTRAINT " + name
        + " FOREIGN KEY (" + column + ") REFERENCES " + referencedTable
        + " (" + referencedColumn + ") ON DELETE CASCADE");
  }
}
