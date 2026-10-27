package user;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.AdminUserUpdate;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** PostgreSQL-only tests use committed fixtures and independent HTTP transactions. */
@Tag("postgres")
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SuperAdminPostgresProtectionTest extends SuperAdminProtectionIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("phase1_superadmin_isolated")
            .withCommand("postgres", "-c", "deadlock_timeout=200ms", "-c", "log_lock_waits=on");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        properties.add("spring.datasource.username", POSTGRES::getUsername);
        properties.add("spring.datasource.password", POSTGRES::getPassword);
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.jpa.database", () -> "postgresql");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.datasource.hikari.connection-init-sql",
                () -> "SET lock_timeout = '8s'; SET statement_timeout = '12s'");
    }

    @Autowired DataSource dataSource;
    private boolean committedFixtures;
    private final List<Long> extraUsers = new ArrayList<>();

    @AfterEach
    void cleanCommittedFixtures() {
        if (!committedFixtures) return;
        // Only this test's synthetic records, never preexisting/default organizations.
        for (Long id : extraUsers) users.deleteById(id);
        users.deleteById(global.getId());
        users.deleteById(actor.getId());
        organizations.deleteById(actor.getOrganizationId());
    }

    @Test
    void verifiesRealEngineAndTransactionConfiguration() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
            assertEquals(16, connection.getMetaData().getDatabaseMajorVersion());
            assertEquals(Connection.TRANSACTION_READ_COMMITTED, connection.getTransactionIsolation());
            assertTrue(connection.getAutoCommit());
        }
        assertEquals("8s", jdbc.queryForObject("show lock_timeout", String.class));
        assertEquals("12s", jdbc.queryForObject("show statement_timeout", String.class));
        System.out.println("PHASE1_ENGINE " + jdbc.queryForObject("select version()", String.class));
    }

    @ParameterizedTest
    @CsvSource({"delete,delete", "disable,disable", "put-disable,put-disable", "lock,lock",
            "delete,disable", "delete,lock"})
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void simultaneousRequestsRetainOneAvailableSuperAdmin(String firstOperation, String secondOperation) throws Exception {
        committedFixtures = true;
        UserEntity second = backup(null);
        for (int iteration = 0; iteration < 3; iteration++) {
            restore(global); restore(second);
            String firstToken = bearer(global);
            String secondToken = bearer(second);
            // Opposite targets preserve the existing prohibition on self-deactivation.
            List<Integer> results = whileBothRequestsAreBlocked(
                    () -> request(accountRequest(second, firstOperation), firstToken),
                    () -> request(accountRequest(global, secondOperation), secondToken));
            assertEquals(1, results.stream().filter(code -> code == 200 || code == 204).count(), results.toString());
            assertEquals(1, results.stream().filter(code -> code == 409).count(), results.toString());
            assertEquals(1L, availableCount());
            System.out.println("PHASE1_RACE " + firstOperation + "/" + secondOperation
                    + " iteration=" + iteration + " statuses=" + results + " available=1");
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"delete", "disable"})
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void organizationRemovalRacingAccountDeletionCannotRemoveBackup(String operation) throws Exception {
        committedFixtures = true;
        UserEntity courseSuperAdmin = backup(actor.getOrganizationId());
        List<Integer> results = whileBothRequestsAreBlocked(
                () -> request(organizationRequest(operation), bearer(global)),
                () -> request(accountRequest(global, "delete"), bearer(courseSuperAdmin)));
        assertEquals(List.of(409, 204), results);
        assertTrue(organizations.findById(actor.getOrganizationId()).orElseThrow().isActive());
        assertTrue(users.existsById(courseSuperAdmin.getId()));
        assertEquals(1L, availableCount());
        System.out.println("PHASE1_ORGANIZATION_RACE " + operation + " statuses=" + results + " available=1");
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void simultaneousOrganizationRemovalsProtectOnlyRemainingSuperAdmin() throws Exception {
        committedFixtures = true;
        UserEntity only = backup(actor.getOrganizationId());
        users.deleteById(global.getId());
        String token = bearer(only);
        assertEquals(List.of(409, 409), whileBothRequestsAreBlocked(
                () -> request(organizationRequest("delete"), token),
                () -> request(organizationRequest("disable"), token)));
        assertEquals(1L, availableCount());
        assertTrue(organizations.findById(actor.getOrganizationId()).orElseThrow().isActive());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void legitimateOrganizationDeactivationReactivationAndCascadeDeletionStillWork() throws Exception {
        committedFixtures = true;
        String token = bearer(global);
        assertEquals(200, request(organizationRequest("disable"), token));
        assertFalse(organizations.findById(actor.getOrganizationId()).orElseThrow().isActive());
        assertEquals(200, request(patch(organizationPath() + "/active").param("value", "true"), token));
        assertEquals(204, request(organizationRequest("delete"), token));
        assertFalse(organizations.existsById(actor.getOrganizationId()));
        assertFalse(users.existsById(actor.getId()), "Production FK cascade must delete the course ADMIN");
        assertTrue(users.existsById(global.getId()));
        assertEquals(1L, availableCount());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void rollbackDiscardsChangesAndReleasesLocks() throws Exception {
        committedFixtures = true;
        String before = users.findById(global.getId()).orElseThrow().getNombre();
        var principal = details(global);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        try {
            assertThrows(ForcedRollback.class, () -> new TransactionTemplate(transactionManager)
                    .executeWithoutResult(ignored -> {
                        service.update(global.getId(), new AdminUserUpdate(
                                "Nombre Temporal", global.getCorreo(), true, true), global.getId());
                        throw new ForcedRollback();
                    }));
        } finally {
            SecurityContextHolder.clearContext();
        }
        assertEquals(before, users.findById(global.getId()).orElseThrow().getNombre());
        // A subsequent independent request can acquire the same rows and commit.
        assertEquals(200, request(put("/api/v1/users/" + global.getId()).content(
                "{\"nombre\":\"Nombre Confirmado\",\"correo\":\"" + global.getCorreo() + "\"}"), bearer(global)));
        assertEquals("NOMBRE CONFIRMADO", users.findById(global.getId()).orElseThrow().getNombre());
        assertEquals(0, jdbc.queryForObject("select count(*) from pg_stat_activity "
                + "where datname=current_database() and state='idle in transaction'", Integer.class));
    }

    private List<Integer> whileBothRequestsAreBlocked(Callable<Integer> first, Callable<Integer> second) throws Exception {
        long deadlocksBefore = deadlocks();
        var pool = Executors.newFixedThreadPool(2);
        try (Connection blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try {
                try (var statement = blocker.createStatement(); var rows = statement.executeQuery(
                        "select id from users where rol='SUPER_ADMIN' order by id for update")) {
                    while (rows.next()) { assertTrue(rows.getLong(1) > 0); }
                }
                var firstResult = pool.submit(first);
                var secondResult = pool.submit(second);
                long deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
                int blocked;
                do {
                    blocked = jdbc.queryForObject("select count(*) from pg_stat_activity "
                            + "where datname=current_database() and wait_event_type='Lock' "
                            + "and cardinality(pg_blocking_pids(pid)) > 0", Integer.class);
                    if (blocked >= 2) break;
                    Thread.sleep(20);
                } while (System.nanoTime() < deadline);
                assertEquals(2, blocked, "Both HTTP transactions must visibly wait for PostgreSQL locks");
                assertFalse(firstResult.isDone()); assertFalse(secondResult.isDone());
                // Rollback of the holder releases locks; each HTTP service controls its own commit/rollback.
                blocker.rollback();
                List<Integer> results = List.of(firstResult.get(15, TimeUnit.SECONDS), secondResult.get(15, TimeUnit.SECONDS));
                assertEquals(deadlocksBefore, deadlocks(), "PostgreSQL must not record a deadlock");
                assertFalse(POSTGRES.getLogs().contains("deadlock detected"));
                System.out.println("PHASE1_LOCKS blocked=" + blocked + " deadlocks=" + deadlocks());
                return results;
            } finally {
                blocker.rollback();
            }
        } finally {
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(15, TimeUnit.SECONDS));
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void lockTimeoutRollsBackWithoutChangingAccountOrLeakingTransaction() throws Exception {
        committedFixtures = true;
        String before = users.findById(global.getId()).orElseThrow().getNombre();
        var pool = Executors.newSingleThreadExecutor();
        try (Connection holder = dataSource.getConnection()) {
            holder.setAutoCommit(false);
            try (var statement = holder.prepareStatement("select id from users where id=? for update")) {
                statement.setLong(1, global.getId());
                try (var rows = statement.executeQuery()) { assertTrue(rows.next()); }
            }
            try {
                var result = pool.submit(() -> {
                    var principal = details(global);
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(ignored -> {
                            jdbc.execute("SET LOCAL lock_timeout = '300ms'");
                            service.update(global.getId(), new AdminUserUpdate(
                                    "Nombre Temporal", global.getCorreo(), true, true), global.getId());
                        });
                        return "unexpected-success";
                    } catch (RuntimeException failure) {
                        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
                            if (cause instanceof java.sql.SQLException sql) return sql.getSQLState();
                        }
                        throw failure;
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                assertEquals("55P03", result.get(10, TimeUnit.SECONDS));
            } finally {
                holder.rollback();
            }
        } finally {
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
        assertEquals(before, users.findById(global.getId()).orElseThrow().getNombre());
        assertEquals(200, request(put("/api/v1/users/" + global.getId()).content(
                "{\"nombre\":\"Nombre Confirmado\",\"correo\":\"" + global.getCorreo() + "\"}"), bearer(global)));
        assertEquals(0L, deadlocks());
        assertEquals(0, jdbc.queryForObject("select count(*) from pg_stat_activity "
                + "where datname=current_database() and state='idle in transaction'", Integer.class));
        System.out.println("PHASE1_TIMEOUT sqlstate=55P03 rollback=verified subsequentRequest=200 deadlocks=0");
    }

    private long deadlocks() {
        return jdbc.queryForObject("select deadlocks from pg_stat_database where datname=current_database()", Long.class);
    }
    private long availableCount() { return users.countAvailableSuperAdministratorsExcluding(-1L); }
    private int request(MockHttpServletRequestBuilder request, String token) throws Exception {
        return mvc.perform(request.header("Authorization", token).contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
    }
    private MockHttpServletRequestBuilder accountRequest(UserEntity target, String operation) {
        String path = "/api/v1/users/" + target.getId();
        return switch (operation) {
            case "delete" -> delete(path);
            case "disable" -> patch(path + "/estado").content("{\"activo\":false}");
            case "put-disable" -> put(path).content("{\"nombre\":\"Persona Prueba\",\"correo\":\""
                    + target.getCorreo() + "\",\"enabled\":false}");
            case "lock" -> put(path).content("{\"nombre\":\"Persona Prueba\",\"correo\":\""
                    + target.getCorreo() + "\",\"accountNonLocked\":false}");
            default -> throw new IllegalArgumentException(operation);
        };
    }
    private MockHttpServletRequestBuilder organizationRequest(String operation) {
        return operation.equals("delete")
                ? delete(organizationPath()).content("{\"organizationName\":\"Curso Prueba\",\"confirmation\":\"ELIMINAR\"}")
                : patch(organizationPath() + "/active").param("value", "false");
    }
    private String organizationPath() { return "/api/v1/organizations/" + actor.getOrganizationId(); }
    private TenantUserDetails details(UserEntity account) {
        return new TenantUserDetails(account.getId(), account.getOrganizationId(), account.getCorreo(),
                account.getPassword(), account.getRol(), true, true);
    }
    private String bearer(UserEntity account) { return "Bearer " + jwt.generateToken(details(account)); }
    private UserEntity backup(Long organizationId) {
        var account = new UserEntity();
        account.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8));
        account.setNombre("PERSONA PRUEBA"); account.setCorreo(UUID.randomUUID() + "@mail.com");
        account.setPassword("$2a$fixturehash"); account.setRol(RoleEnum.SUPER_ADMIN);
        account.setOrganizationId(organizationId); account.setEnabled(true); account.setAccountNonLocked(true);
        UserEntity saved = users.saveAndFlush(account);
        extraUsers.add(saved.getId());
        return saved;
    }
    private void restore(UserEntity account) {
        // Restore an account deleted by the preceding iteration, using a new generated ID if necessary.
        if (!users.existsById(account.getId())) {
            extraUsers.remove(account.getId());
            account.setId(null);
        }
        account.setEnabled(true); account.setAccountNonLocked(true);
        UserEntity saved = users.saveAndFlush(account);
        account.setId(saved.getId());
        if (!account.getId().equals(global.getId()) && !extraUsers.contains(account.getId())) extraUsers.add(account.getId());
    }
    private static class ForcedRollback extends RuntimeException { }
}
