package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.application.usecase.SecurityMailQueue;
import com.tesoreria.user.core.model.RecoveryLink;
import com.tesoreria.user.core.port.out.EmailOutPort;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Only synthetic data. Runs the exact immutable production image on an isolated Docker network. */
@Tag("postgres")
// This release-only fixture pulls a private production image, unavailable to ordinary CI runners.
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named = "TREASURY_RUN_PRODUCTION_BRIDGE_TEST", matches = "true")
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ProductionBridgePostgresTest {
    static final Network NETWORK = Network.newNetwork();
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.6-alpine")
            .withDatabaseName("bridge_isolated").withNetwork(NETWORK).withNetworkAliases("bridge-db");
    static final String LEGACY_IMAGE = "southamerica-west1-docker.pkg.dev/treasury-system-app-vivas/docker-images/"
            + "tesoreria-backend@sha256:80eb08360be49a8255baf571e50560c37b8a5d322050c60f1b83ed7baacb8a43";
    static final String PASSWORD = "BridgeFixture1!";
    static final EmailOutPort EMAIL = mock(EmailOutPort.class);
    @Configuration(proxyBeanMethods = false)
    static class MailConfig {
        @Bean @Primary EmailOutPort bridgeMail() { return EMAIL; }
    }
    final HttpClient http = HttpClient.newHttpClient();
    final ObjectMapper json = new ObjectMapper();
    ConfigurableApplicationContext current;
    GenericContainer<?> legacy;
    JdbcTemplate jdbc;
    Flyway flyway;
    Map<String, Object> preservedInvitation;
    Long course;
    Long user;
    Long guardian;
    int applied;

    @BeforeAll void upgradeFromRealPublishedSchema() throws Exception {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).target("54").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        course = course("Legacy course");
        user = user("legacy@example.test", course);
        guardian = jdbc.queryForObject("INSERT INTO apoderados(codigo,nombre,email,telefono,activo,organization_id) "
                + "VALUES ('AP-BRIDGE','Test Guardian','legacy@example.test','00000000',true,?) RETURNING apoderado_id", Long.class, course);
        jdbc.update("INSERT INTO user_tokens(user_id,type,token_hash,expires_at,invitation_channel) "
                + "VALUES (?,'PASSWORD_RESET',?,CURRENT_TIMESTAMP+interval '1 hour','EMAIL')", user, "a".repeat(64));
        jdbc.update("INSERT INTO guardian_whatsapp_invitations(organization_id,guardian_id,user_id,token_hash,phone,consent_source,"
                + "consent_at,consent_recorded_by,created_at,expires_at,delivery_status,simulated) "
                + "VALUES (?,?,?,?,'00000000','synthetic fixture',CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '1 hour','DELIVERED',true)",
                course, guardian, user, "b".repeat(64), user);
        preservedInvitation = jdbc.queryForMap("SELECT * FROM guardian_whatsapp_invitations WHERE user_id=?", user);
        legacy = legacyContainer(); legacy.start();
        assertEquals(200, legacyLogin().statusCode());
        flyway = Flyway.configure().dataSource(dataSource).load();
        applied = flyway.migrate().migrationsExecuted;
        // Query through the already running v1.34.0 instance after the expansion.
        assertEquals(200, legacyLogin().statusCode());
        current = startCurrent();
    }

    ConfigurableApplicationContext startCurrent(String... overrides) {
        var args = new java.util.ArrayList<>(List.of(
                "--spring.profiles.active=test", "--server.port=0", "--server.servlet.context-path=", "--spring.config.import=",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(), "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword(), "--spring.datasource.driver-class-name=org.postgresql.Driver",
                "--spring.jpa.database=postgresql", "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.enabled=true",
                "--app.storage.gcs.enabled=false", "--app.security.mail-worker-enabled=false", "--MERCADO_PAGO_ACCESS_TOKEN=",
                "--MERCADO_PAGO_WEBHOOK_SECRET=", "--MERCADO_PAGO_ORGANIZATION_ID=0", "--MERCADO_PAGO_COLLECTOR_ID=",
                "--MERCADO_PAGO_RETURN_URL=", "--MERCADO_PAGO_WEBHOOK_URL="));
        args.addAll(List.of(overrides));
        return new SpringApplicationBuilder(TesoreriaAppApplication.class, MailConfig.class).profiles("test").run(args.toArray(String[]::new));
    }

    GenericContainer<?> legacyContainer() {
        return new GenericContainer<>(LEGACY_IMAGE).withNetwork(NETWORK).withExposedPorts(8080).withCommand(
                "--spring.profiles.active=test", "--server.port=8080", "--server.servlet.context-path=/tesoreria", "--spring.config.import=",
                "--spring.datasource.url=jdbc:postgresql://bridge-db:5432/bridge_isolated",
                "--spring.datasource.username=" + POSTGRES.getUsername(), "--spring.datasource.password=" + POSTGRES.getPassword(),
                "--spring.datasource.driver-class-name=org.postgresql.Driver", "--spring.jpa.database=postgresql",
                "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.enabled=true", "--app.storage.gcs.enabled=false",
                "--spring.mail.host=127.0.0.1", "--spring.mail.port=9", "--app.refresh-token.cookie-secure=false",
                "--WHATSAPP_ENABLED=false", "--WEB_PUSH_ENABLED=false", "--MERCADO_PAGO_ACCESS_TOKEN=",
                "--MERCADO_PAGO_WEBHOOK_SECRET=", "--MERCADO_PAGO_ORGANIZATION_ID=0", "--MERCADO_PAGO_COLLECTOR_ID=",
                "--MERCADO_PAGO_RETURN_URL=", "--MERCADO_PAGO_WEBHOOK_URL=")
                .waitingFor(Wait.forHttp("/tesoreria/api/v1/auth/me").forStatusCode(401)).withStartupTimeout(Duration.ofSeconds(120));
    }

    @BeforeEach void resetBudgets() {
        jdbc.update("DELETE FROM security_rate_buckets"); jdbc.update("DELETE FROM security_mail_requests");
        reset(EMAIL);
        when(EMAIL.sendRecoverySummary(anyString(), anyString(), anyList())).thenReturn(true);
        when(EMAIL.sendVerificationEmail(anyString(), anyString(), anyString(), any())).thenReturn(true);
        when(EMAIL.sendGuardianInvitationEmail(anyString(), anyString(), anyString(), any())).thenReturn(true);
        when(EMAIL.sendPasswordChangedEmail(anyString(), anyString(), any(), any())).thenReturn(true);
        ReflectionTestUtils.setField(current.getBean(AccountRecoveryService.class), "accountLinkFragmentsEnabled", false);
    }

    @AfterAll void closeApplications() {
        if (current != null) current.close();
        if (legacy != null) legacy.close();
        POSTGRES.stop(); NETWORK.close();
    }

    @Test void expansionPreservesLegacyDataAndIsIdempotentOn18_6() {
        assertTrue(jdbc.queryForObject("SHOW server_version", String.class).startsWith("18.6"));
        assertEquals(1, applied);
        assertEquals("58", flyway.info().current().getVersion().getVersion());
        assertEquals(preservedInvitation, jdbc.queryForMap("SELECT * FROM guardian_whatsapp_invitations WHERE user_id=?", user));
        assertEquals("EMAIL", jdbc.queryForObject("SELECT invitation_channel FROM user_tokens WHERE token_hash=?", String.class, "a".repeat(64)));
        flyway.validate(); assertEquals(0, flyway.migrate().migrationsExecuted);
    }

    @Test void oldBackendCanRestartAndRotateRefreshOnExpandedSchema() throws Exception {
        legacy.close(); legacy = legacyContainer(); legacy.start();
        var login = legacyLogin(); assertEquals(200, login.statusCode());
        String cookies = login.headers().allValues("Set-Cookie").stream().map(value -> value.split(";", 2)[0])
                .collect(java.util.stream.Collectors.joining("; "));
        String csrf = json.readTree(login.body()).get("csrfToken").asString();
        var refresh = http.send(HttpRequest.newBuilder(URI.create(legacyUrl() + "/auth/refresh"))
                .header("Cookie", cookies).header("X-CSRF-Token", csrf).POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, refresh.statusCode()); assertTrue(json.readTree(refresh.body()).has("token"));
    }

    @Test void publishedFrontendContractGetsUniformMulticourseRecoveryAndQueryLinks() throws Exception {
        String address = "multicourse@example.test";
        user(address, course("First course")); user(address, course("Second course"));
        var known = request("auth/forgot-password", Map.of("email", address));
        var unknown = request("auth/forgot-password", Map.of("email", "unknown@example.test"));
        assertEquals(200, known.statusCode()); assertEquals(known.body(), unknown.body());
        var response = json.readTree(known.body());
        assertFalse(response.get("requiresOrganizationSelection").asBoolean());
        assertEquals(0, response.get("organizationOptions").size());
        assertTrue(current.getBean(SecurityMailQueue.class).deliverOne());
        var links = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(EMAIL).sendRecoverySummary(eq(address), anyString(), links.capture());
        assertEquals(2, links.getValue().size());
        for (Object value : links.getValue()) {
            URI url = URI.create(((RecoveryLink) value).url());
            assertNull(url.getFragment()); assertTrue(url.getQuery().startsWith("token="));
        }
    }

    @Test void transportCanBeEnabledAndRevertedWithoutChangingTokenValidation() throws Exception {
        var recovery = current.getBean(AccountRecoveryService.class);
        String address = "transport@example.test";
        user(address, course("Transport course"));
        for (boolean fragment : new boolean[]{false, true, false}) {
            ReflectionTestUtils.setField(recovery, "accountLinkFragmentsEnabled", fragment);
            recovery.deliverPublicMail("password-reset", address);
            var links = org.mockito.ArgumentCaptor.forClass(List.class);
            verify(EMAIL, atLeastOnce()).sendRecoverySummary(eq(address), anyString(), links.capture());
            URI url = URI.create(((RecoveryLink) links.getValue().get(0)).url());
            String credential = fragment ? url.getFragment() : url.getQuery();
            assertNotNull(credential); assertTrue(credential.startsWith("token="));
            String password = fragment ? "FragmentProof1!" : "QueryProof1!";
            var result = request("auth/reset-password", Map.of("token", credential.substring(6), "newPassword", password));
            // Different passwords across iterations, including reverting the transport.
            assertEquals(200, result.statusCode());
        }
    }

    @Test void invitationAndVerificationWorkInBothModesWithoutIssuingSessions() throws Exception {
        String access = json.readTree(request("auth/login", Map.of("correo", "legacy@example.test", "password", PASSWORD)).body())
                .get("token").asString();
        var recovery = current.getBean(AccountRecoveryService.class);
        for (boolean fragment : new boolean[]{false, true}) {
            ReflectionTestUtils.setField(recovery, "accountLinkFragmentsEnabled", fragment);
            String address = "invited-" + fragment + "@example.test";
            String code = "AP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase(java.util.Locale.ROOT);
            jdbc.update("INSERT INTO apoderados(codigo,nombre,email,telefono,activo,organization_id) VALUES (?,'Invited Fixture',?,'00000000',true,?)",
                    code, address, course);
            assertEquals(200, request("apoderados/" + code + "/habilitar-acceso", Map.of(), "Authorization", "Bearer " + access).statusCode());
            var invitation = org.mockito.ArgumentCaptor.forClass(String.class);
            verify(EMAIL).sendGuardianInvitationEmail(eq(address), anyString(), invitation.capture(), any());
            String raw = credential(invitation.getValue(), fragment);
            assertEquals(204, request("auth/validate-invitation", Map.of("token", raw)).statusCode());
            assertEquals(200, request("auth/reset-password", Map.of("token", raw, "newPassword", "InvitedProof1!")).statusCode());
            jdbc.update("UPDATE users SET email_verified_at=NULL WHERE correo=?", address);
            assertEquals(200, request("auth/resend-verification", Map.of("email", address)).statusCode());
            assertTrue(current.getBean(SecurityMailQueue.class).deliverOne());
            var verification = org.mockito.ArgumentCaptor.forClass(String.class);
            verify(EMAIL).sendVerificationEmail(eq(address), anyString(), verification.capture(), any());
            String proof = credential(verification.getValue(), fragment);
            var verified = request("auth/verify-email", Map.of("token", proof));
            assertEquals(200, verified.statusCode());
            assertFalse(json.readTree(verified.body()).has("token"));
            assertTrue(verified.headers().allValues("Set-Cookie").isEmpty());
            assertNotEquals(200, request("auth/verify-email", Map.of("token", proof)).statusCode());
        }
    }

    @Test void fragmentFlagBindsFromConfigurationWhileBridgeDefaultIsQuery() {
        assertEquals(false, ReflectionTestUtils.getField(current.getBean(AccountRecoveryService.class), "accountLinkFragmentsEnabled"));
        try (var enabled = startCurrent("--ACCOUNT_LINK_USE_FRAGMENT=true")) {
            assertEquals(true, ReflectionTestUtils.getField(enabled.getBean(AccountRecoveryService.class), "accountLinkFragmentsEnabled"));
            String address = "configured@example.test";
            user(address, course("Configured course"));
            enabled.getBean(AccountRecoveryService.class).deliverPublicMail("password-reset", address);
            var links = org.mockito.ArgumentCaptor.forClass(List.class);
            verify(EMAIL).sendRecoverySummary(eq(address), anyString(), links.capture());
            assertNotNull(URI.create(((RecoveryLink) links.getValue().get(0)).url()).getFragment());
        }
    }

    @Test void divergentPersistentHistoryIsRejectedWithoutRepairOrApplying58() {
        jdbc.execute("CREATE DATABASE bridge_divergent");
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl().replace("/bridge_isolated", "/bridge_divergent"),
                POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(source).locations("classpath:db/migration", "filesystem:migration-history").target("55").load().migrate();
        var candidate = Flyway.configure().dataSource(source).load();
        assertThrows(org.flywaydb.core.api.FlywayException.class, candidate::migrate);
        var divergent = new JdbcTemplate(source);
        assertEquals("55", divergent.queryForObject("SELECT version FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1", String.class));
        assertNull(divergent.queryForObject("SELECT to_regclass('public.security_rate_buckets')::text", String.class));
    }

    String credential(String link, boolean fragment) {
        URI url = URI.create(link);
        String value = fragment ? url.getFragment() : url.getQuery();
        assertNotNull(value); assertTrue(value.startsWith("token="));
        assertNull(fragment ? url.getQuery() : url.getFragment());
        return value.substring(6);
    }

    Long course(String name) {
        return jdbc.queryForObject("INSERT INTO organizations(name,slug,type,school_year,active,created_at,updated_at) "
                + "VALUES (?,?,'COURSE',2026,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id", Long.class, name, java.util.UUID.randomUUID().toString());
    }
    Long user(String address, Long organization) {
        return jdbc.queryForObject("INSERT INTO users(code,nombre,correo,password,rol,enabled,account_non_locked,email_verified_at,organization_id) "
                + "VALUES (?,'Test Account',?,?,'ADMIN',true,true,CURRENT_TIMESTAMP,?) RETURNING id", Long.class,
                "USR-" + java.util.UUID.randomUUID().toString().substring(0, 8), address, new BCryptPasswordEncoder().encode(PASSWORD), organization);
    }
    String legacyUrl() { return "http://" + legacy.getHost() + ":" + legacy.getMappedPort(8080) + "/tesoreria/api/v1"; }
    HttpResponse<String> legacyLogin() throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create(legacyUrl() + "/auth/login")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("correo", "legacy@example.test", "password", PASSWORD))))
                .build(), HttpResponse.BodyHandlers.ofString());
    }
    HttpResponse<String> request(String path, Map<String, ?> body, String... headers) throws Exception {
        int port = ((WebServerApplicationContext) current).getWebServer().getPort();
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/" + path)).header("Content-Type", "application/json");
        for (int index = 0; index < headers.length; index += 2) builder.header(headers[index], headers[index + 1]);
        return http.send(builder.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
}
