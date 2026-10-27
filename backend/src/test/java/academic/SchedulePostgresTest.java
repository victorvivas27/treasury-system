package academic;

import com.tesoreria.TesoreriaAppApplication;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Tag("postgres")
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SchedulePostgresTest extends ScheduleHttpPersistenceTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");
    @Autowired Flyway flyway;
    @Autowired DataSource dataSource;

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        properties.add("spring.datasource.username", POSTGRES::getUsername);
        properties.add("spring.datasource.password", POSTGRES::getPassword);
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.jpa.database", () -> "postgresql");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Test void migrationRunsOnEmptyPostgresAndSecondStartupValidatesExistingSchema() throws Exception {
        try (var connection = dataSource.getConnection()) {
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
        }
        flyway.validate();
        assertEquals(0, flyway.migrate().migrationsExecuted);
        try (var restarted = new SpringApplicationBuilder(TesoreriaAppApplication.class).profiles("test").run(
                "--server.port=0", "--spring.config.import=",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword(),
                "--spring.datasource.driver-class-name=org.postgresql.Driver",
                "--spring.jpa.database=postgresql", "--spring.jpa.hibernate.ddl-auto=validate",
                "--spring.flyway.enabled=true", "--app.web-push.enabled=false", "--app.storage.gcs.enabled=false",
                "--MERCADO_PAGO_ACCESS_TOKEN=", "--MERCADO_PAGO_WEBHOOK_SECRET=",
                "--MERCADO_PAGO_ORGANIZATION_ID=0", "--MERCADO_PAGO_COLLECTOR_ID=",
                "--MERCADO_PAGO_RETURN_URL=", "--MERCADO_PAGO_WEBHOOK_URL=")) {
            assertNotNull(restarted.getBean(jakarta.persistence.EntityManagerFactory.class));
            assertEquals("58", restarted.getBean(Flyway.class).info().current().getVersion().toString());
        }
    }
}
