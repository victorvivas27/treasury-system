package user;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.*;

@Tag("postgres")
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SA34PostgresWhatsAppTest extends SA02InvitationIntegrationTest {
 @Container
 static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");
 @Autowired DataSource dataSource;
 @DynamicPropertySource static void postgres(DynamicPropertyRegistry properties) {
  properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
  properties.add("spring.datasource.username", POSTGRES::getUsername);
  properties.add("spring.datasource.password", POSTGRES::getPassword);
  properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
  properties.add("spring.jpa.database", () -> "postgresql");
  properties.add("spring.flyway.enabled", () -> "true");
  properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
 }
 @Test void migrationIsIdempotentAndSecondStartupValidatesSchema() throws Exception {
  var flyway = org.flywaydb.core.Flyway.configure().dataSource(dataSource).load();
  flyway.validate(); assertEquals("53", flyway.info().current().getVersion().getVersion());
  assertEquals(0, flyway.migrate().migrationsExecuted);
  try (var connection = dataSource.getConnection()) { assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName()); }
  try (var restarted = new org.springframework.boot.builder.SpringApplicationBuilder(
   com.tesoreria.TesoreriaAppApplication.class).profiles("test").run(
    "--server.port=0", "--spring.config.import=",
    "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
    "--spring.datasource.username=" + POSTGRES.getUsername(),
    "--spring.datasource.password=" + POSTGRES.getPassword(), "--spring.datasource.driver-class-name=org.postgresql.Driver",
    "--spring.jpa.database=postgresql", "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.enabled=true",
    "--app.storage.gcs.enabled=false", "--MERCADO_PAGO_ACCESS_TOKEN=", "--MERCADO_PAGO_WEBHOOK_SECRET=",
    "--MERCADO_PAGO_ORGANIZATION_ID=0", "--MERCADO_PAGO_COLLECTOR_ID=", "--MERCADO_PAGO_RETURN_URL=", "--MERCADO_PAGO_WEBHOOK_URL=")) {
     assertTrue(restarted.isActive());
     assertEquals("53", restarted.getBean(org.flywaydb.core.Flyway.class).info().current().getVersion().getVersion());
  }
 }
}
