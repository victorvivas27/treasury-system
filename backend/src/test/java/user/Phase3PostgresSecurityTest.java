package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.application.usecase.SharedSecurityLimiter;
import com.tesoreria.user.application.usecase.SecurityMailQueue;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.SecurityLimitException;
import com.tesoreria.user.core.model.RecoveryLink;
import com.tesoreria.user.core.port.out.EmailOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.MapPropertySource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Two independently running Spring applications, separate pools, one disposable PostgreSQL database. */
@Tag("postgres")
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Phase3PostgresSecurityTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("phase3_isolated")
            .withCommand("postgres", "-c", "deadlock_timeout=200ms");
    static final EmailOutPort EMAIL = mock(EmailOutPort.class);
    static final String PASSWORD = "Phase3Password1!";
    @Configuration(proxyBeanMethods = false)
    static class MailConfig {
        @Bean @Primary EmailOutPort phase3Mail() { return EMAIL; }
    }
    ConfigurableApplicationContext first;
    ConfigurableApplicationContext second;
    JdbcTemplate jdbc;
    ObjectMapper json;
    String hash;
    UserEntity actor;
    final Map<String, Object> overrides = new ConcurrentHashMap<>();
    final HttpClient http = HttpClient.newHttpClient();

    @BeforeAll void startApplications() {
        first = start(); second = start();
        assertNotSame(first.getBean(SharedSecurityLimiter.class), second.getBean(SharedSecurityLimiter.class));
        assertNotSame(first.getBean(javax.sql.DataSource.class), second.getBean(javax.sql.DataSource.class));
        jdbc = first.getBean(JdbcTemplate.class); json = first.getBean(ObjectMapper.class);
        hash = first.getBean(PasswordEncoder.class).encode(PASSWORD);
        System.out.println("PHASE3_ENGINE " + jdbc.queryForObject("select version()", String.class));
    }
    ConfigurableApplicationContext start() {
        var context = new SpringApplicationBuilder(TesoreriaAppApplication.class, MailConfig.class).profiles("test").run(
                "--spring.profiles.active=test", "--server.port=0", "--server.servlet.context-path=", "--spring.config.import=",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(), "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword(), "--spring.datasource.driver-class-name=org.postgresql.Driver",
                "--spring.jpa.database=postgresql", "--spring.flyway.enabled=true", "--spring.jpa.hibernate.ddl-auto=validate",
                "--app.storage.gcs.enabled=false", "--app.security.mail-worker-enabled=false", "--MERCADO_PAGO_ACCESS_TOKEN=",
                "--MERCADO_PAGO_WEBHOOK_SECRET=", "--MERCADO_PAGO_ORGANIZATION_ID=0", "--MERCADO_PAGO_COLLECTOR_ID=",
                "--MERCADO_PAGO_RETURN_URL=", "--MERCADO_PAGO_WEBHOOK_URL=");
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("phase3TestOverrides", overrides));
        return context;
    }
    @AfterAll void stopApplications() { if (second != null) second.close(); if (first != null) first.close(); }
    @BeforeEach void fixtures() {
        overrides.clear(); reset(EMAIL);
        jdbc.update("DELETE FROM security_rate_buckets"); jdbc.update("DELETE FROM security_mail_requests");
        when(EMAIL.sendRecoverySummary(anyString(), anyString(), anyList())).thenReturn(true);
        when(EMAIL.sendPasswordChangedEmail(anyString(), anyString(), any(), any())).thenReturn(true);
        actor = account("actor-" + UUID.randomUUID() + "@example.test", null);
    }
    UserEntity account(String email, Long organizationId) {
        var user = new UserEntity(); user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8));
        user.setNombre("PRUEBA SEGURIDAD"); user.setCorreo(email); user.setPassword(hash);
        user.setRol(organizationId == null ? RoleEnum.SUPER_ADMIN : RoleEnum.ADMIN); user.setOrganizationId(organizationId);
        user.setEnabled(true); user.setAccountNonLocked(true); user.setEmailVerifiedAt(LocalDateTime.now());
        return first.getBean(UserJpaRepository.class).saveAndFlush(user);
    }
    Long course(String name) {
        var course = new OrganizationEntity(); course.setName(name); course.setSlug(UUID.randomUUID().toString());
        course.setType(OrganizationType.COURSE); course.setSchoolYear(2026); course.setActive(true);
        return first.getBean(OrganizationJpaRepository.class).saveAndFlush(course).getId();
    }
    HttpResponse<String> request(ConfigurableApplicationContext app, String method, String path, Map<String, ?> body,
                                 String... headers) throws Exception {
        int port = ((WebServerApplicationContext) app).getWebServer().getPort();
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/" + path))
                .header("Content-Type", "application/json").timeout(java.time.Duration.ofSeconds(15));
        for (int index = 0; index < headers.length; index += 2) builder.header(headers[index], headers[index + 1]);
        builder.method(method, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
    HttpResponse<String> login(ConfigurableApplicationContext app, String address, String password, String... headers) throws Exception {
        return request(app, "POST", "auth/login", Map.of("correo", address, "password", password), headers);
    }
    String access() {
        return first.getBean(JwtService.class).generateToken(first.getBean(CustomUserDetailsService.class).loadUserById(actor.getId()));
    }
    void expireBudgets() { jdbc.update("UPDATE security_rate_buckets SET expires_at=CURRENT_TIMESTAMP - interval '1 second'"); }

    @Test void atomicAdmissionAcrossTwoInstancesHasNoLostUpdatesAndExpires() throws Exception {
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(12);
        List<Future<Integer>> requests = new ArrayList<>(); List<Long> timings = new CopyOnWriteArrayList<>();
        try {
            for (int index = 0; index < 40; index++) {
                var limiter = (index % 2 == 0 ? first : second).getBean(SharedSecurityLimiter.class);
                requests.add(pool.submit(() -> {
                    start.await(); long began = System.nanoTime();
                    try { limiter.check("race", 8, 60, "same-account"); return 200; }
                    catch (SecurityLimitException limited) { assertTrue(limited.getRetryAfter() <= 60); return 429; }
                    finally { timings.add(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - began)); }
                }));
            }
            start.countDown(); int allowed = 0;
            for (var result : requests) if (result.get(20, TimeUnit.SECONDS) == 200) allowed++;
            assertEquals(8, allowed);
            assertThrows(SecurityLimitException.class, () -> first.getBean(SharedSecurityLimiter.class).check("race", 8, 60, "same-account"));
            expireBudgets(); assertDoesNotThrow(() -> second.getBean(SharedSecurityLimiter.class).check("race", 8, 60, "same-account"));
            timings.sort(Long::compareTo);
            System.out.println("PHASE3_CONCURRENCY requests=40 allowed=8 rejected=32 p50ms=" + timings.get(20) + " p95ms=" + timings.get(37));
            assertEquals(0L, jdbc.queryForObject("SELECT deadlocks FROM pg_stat_database WHERE datname=current_database()", Long.class));
        } finally { pool.shutdownNow(); assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS)); }
    }
    @Test void httpLoginLimitsSurviveSuccessAndForgedHeadersAndThenExpire() throws Exception {
        overrides.put("app.security.limits.login-ip.max", 4);
        for (int index = 0; index < 4; index++) assertEquals(200, login(index % 2 == 0 ? first : second, actor.getCorreo(), PASSWORD,
                "X-Forwarded-For", "198.51.100." + index, "Forwarded", "for=203.0.113." + index).statusCode());
        var denied = login(second, actor.getCorreo(), PASSWORD, "X-Forwarded-For", "192.0.2.9");
        assertEquals(429, denied.statusCode()); assertTrue(Long.parseLong(denied.headers().firstValue("Retry-After").orElseThrow()) > 0);
        assertTrue(denied.headers().allValues("Set-Cookie").isEmpty());
        expireBudgets(); assertEquals(200, login(first, actor.getCorreo(), PASSWORD).statusCode());
    }
    @Test void failedLoginProtectionIsSharedAndItsWindowDoesNotExtend() throws Exception {
        for (int index = 0; index < 3; index++) assertEquals(401, login(index % 2 == 0 ? first : second, actor.getCorreo(), "Wrong1!").statusCode());
        var expiry = jdbc.queryForList("SELECT expires_at FROM security_rate_buckets ORDER BY bucket_key");
        assertEquals(429, login(second, actor.getCorreo(), PASSWORD).statusCode());
        assertEquals(expiry, jdbc.queryForList("SELECT expires_at FROM security_rate_buckets ORDER BY bucket_key"));
        expireBudgets(); assertEquals(200, login(first, actor.getCorreo(), PASSWORD).statusCode());
    }
    @Test void fiftyLegitimateUsersCanShareAnIp() throws Exception {
        for (int index = 0; index < 50; index++) {
            var user = account("shared-" + UUID.randomUUID() + "@example.test", null);
            assertEquals(200, login(index % 2 == 0 ? first : second, user.getCorreo(), PASSWORD).statusCode());
        }
        System.out.println("PHASE3_SHARED_IP legitimateLogins=50 accepted=50");
    }
    @Test void recoveryIsUniformForUnknownAndMulticourseAndOrganizationCannotBypassBudget() throws Exception {
        String address = "multi-" + UUID.randomUUID() + "@example.test";
        var one = account(address, course("Curso Uno")); var two = account(address, course("Curso Dos"));
        var unknown = request(first, "POST", "auth/forgot-password", Map.of("email", "missing@example.test"));
        var known = request(second, "POST", "auth/forgot-password", Map.of("email", address, "organizationId", -999));
        assertEquals(200, unknown.statusCode()); assertEquals(unknown.body(), known.body());
        assertFalse(known.body().contains("Curso")); assertFalse(known.body().contains("organizationOptions\":[{"));
        verifyNoInteractions(EMAIL);
        assertEquals(429, request(first, "POST", "auth/forgot-password", Map.of("email", address.toUpperCase(Locale.ROOT), "organizationId", one.getOrganizationId())).statusCode());
        var worker = second.getBean(SecurityMailQueue.class);
        assertTrue(worker.deliverOne()); assertTrue(worker.deliverOne());
        var links = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(EMAIL).sendRecoverySummary(eq(address), anyString(), links.capture());
        assertEquals(2, links.getValue().size());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM user_tokens WHERE type='PASSWORD_RESET' AND user_id IN (?,?)",
                Integer.class, one.getId(), two.getId()));
        RecoveryLink proof = (RecoveryLink) links.getValue().get(0);
        assertTrue(proof.course().contains("Curso"));
        String raw = proof.url().split("token=")[1];
        assertEquals(200, request(first, "POST", "auth/reset-password", Map.of("token", raw, "newPassword", "ChangedPhase3Pass1!")).statusCode());
        assertNotEquals(200, request(second, "POST", "auth/reset-password", Map.of("token", raw, "newPassword", "AnotherPass1!")).statusCode());
    }
    @Test void smtpFailureIsInvisibleAndAnotherWorkerRetriesThePersistedRequest() throws Exception {
        when(EMAIL.sendRecoverySummary(anyString(), anyString(), anyList())).thenThrow(new IllegalStateException("fixture SMTP failure"));
        var accepted = request(first, "POST", "auth/forgot-password", Map.of("email", actor.getCorreo()));
        assertEquals(200, accepted.statusCode()); verifyNoInteractions(EMAIL);
        assertFalse(first.getBean(SecurityMailQueue.class).deliverOne());
        assertEquals(1, jdbc.queryForObject("SELECT attempts FROM security_mail_requests", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM user_tokens WHERE user_id=? AND type='PASSWORD_RESET'", Integer.class, actor.getId()));
        jdbc.update("UPDATE security_mail_requests SET available_at=?", Timestamp.valueOf(LocalDateTime.now().minusMinutes(1)));
        doReturn(true).when(EMAIL).sendRecoverySummary(anyString(), anyString(), anyList());
        assertTrue(second.getBean(SecurityMailQueue.class).deliverOne());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM security_mail_requests", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM user_tokens WHERE user_id=? AND type='PASSWORD_RESET'", Integer.class, actor.getId()));
    }
    @Test void administrativeMutationsAreLimitedPerVerifiedActorAndReadsRemainAvailable() throws Exception {
        overrides.put("app.security.limits.admin-mutations.max", 1);
        String authorization = "Bearer " + access();
        Long target = course("Prueba administración");
        assertEquals(200, request(first, "PATCH", "organizations/" + target + "/active?value=false", Map.of(), "Authorization", authorization).statusCode());
        assertEquals(429, request(second, "PATCH", "organizations/" + target + "/active?value=true", Map.of(), "Authorization", authorization).statusCode());
        assertEquals(200, request(first, "GET", "organizations", Map.of(), "Authorization", authorization).statusCode());
    }
    @Test void unavailableSharedStoreFailsClosedWithoutIssuingSession() throws Exception {
        jdbc.execute("ALTER TABLE security_rate_buckets RENAME TO security_rate_buckets_unavailable");
        try {
            var response = login(second, actor.getCorreo(), PASSWORD);
            assertEquals(503, response.statusCode()); assertTrue(response.headers().allValues("Set-Cookie").isEmpty());
        } finally { jdbc.execute("ALTER TABLE security_rate_buckets_unavailable RENAME TO security_rate_buckets"); }
    }
    @Test void migrationIsIdempotentAndBothInstancesUseSchema58() {
        var flyway = first.getBean(org.flywaydb.core.Flyway.class);
        flyway.validate(); assertEquals("58", flyway.info().current().getVersion().getVersion());
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals("58", second.getBean(org.flywaydb.core.Flyway.class).info().current().getVersion().getVersion());
    }

    HttpResponse<String> refresh(ConfigurableApplicationContext app, HttpResponse<String> previous) throws Exception {
        String cookies = previous.headers().allValues("Set-Cookie").stream().map(value -> value.split(";", 2)[0])
                .collect(java.util.stream.Collectors.joining("; "));
        String csrf = json.readTree(previous.body()).get("csrfToken").asString();
        return request(app, "POST", "auth/refresh", Map.of(), "Cookie", cookies, "X-CSRF-Token", csrf);
    }
    @Test void refreshRotationSharesTheFamilyBudgetAnd429DoesNotConsumeTheRefreshToken() throws Exception {
        overrides.put("app.security.limits.refresh-family.max", 2);
        var session = login(first, actor.getCorreo(), PASSWORD); assertEquals(200, session.statusCode());
        var rotated = refresh(second, session); assertEquals(200, rotated.statusCode());
        var latest = refresh(first, rotated); assertEquals(200, latest.statusCode());
        var denied = refresh(second, latest); assertEquals(429, denied.statusCode());
        assertTrue(denied.headers().allValues("Set-Cookie").isEmpty());
        assertTrue(denied.headers().firstValue("Retry-After").isPresent());
        expireBudgets(); assertEquals(200, refresh(first, latest).statusCode());
    }
    @Test void unknownAddressesHaveTheSameHourlyRecoveryBudgetDespiteChangingCourses() throws Exception {
        for (int index = 0; index < 5; index++) {
            assertEquals(200, request(index % 2 == 0 ? first : second, "POST", "auth/forgot-password",
                    Map.of("email", "unknown-hour@example.test", "organizationId", index + 1)).statusCode());
            jdbc.update("UPDATE security_rate_buckets SET expires_at=CURRENT_TIMESTAMP-interval '1 second' "
                    + "WHERE expires_at<CURRENT_TIMESTAMP+interval '2 minutes'");
        }
        assertEquals(429, request(first, "POST", "auth/forgot-password",
                Map.of("email", "unknown-hour@example.test", "organizationId", 999)).statusCode());
        assertEquals(5, jdbc.queryForObject("SELECT count(*) FROM security_mail_requests", Integer.class));
        verifyNoInteractions(EMAIL);
        expireBudgets(); assertEquals(200, request(second, "POST", "auth/forgot-password", Map.of("email", "unknown-hour@example.test")).statusCode());
    }
    @Test void verificationRequestsAreUniformAndLimitedBeforeDelivery() throws Exception {
        var known = request(first, "POST", "auth/resend-verification", Map.of("email", actor.getCorreo()));
        var unknown = request(second, "POST", "auth/resend-verification", Map.of("email", "unknown-verify@example.test"));
        assertEquals(200, known.statusCode()); assertEquals(known.body(), unknown.body());
        assertEquals(429, request(second, "POST", "auth/resend-verification", Map.of("email", actor.getCorreo(), "organizationId", 99)).statusCode());
        verifyNoInteractions(EMAIL);
    }
    @Test void failedWorkerRequestsAreRetainedForOperatorReviewInsteadOfBeingDropped() throws Exception {
        doReturn(false).when(EMAIL).sendRecoverySummary(anyString(), anyString(), anyList());
        assertEquals(200, request(first, "POST", "auth/forgot-password", Map.of("email", actor.getCorreo())).statusCode());
        for (int index = 0; index < 8; index++) {
            assertFalse((index % 2 == 0 ? first : second).getBean(SecurityMailQueue.class).deliverOne());
            jdbc.update("UPDATE security_mail_requests SET available_at=CURRENT_TIMESTAMP-interval '1 second'");
        }
        assertEquals("FAILED", jdbc.queryForObject("SELECT status FROM security_mail_requests", String.class));
        assertEquals(8, jdbc.queryForObject("SELECT attempts FROM security_mail_requests", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM user_tokens WHERE type='PASSWORD_RESET' AND user_id=?", Integer.class, actor.getId()));
        assertFalse(first.getBean(SecurityMailQueue.class).deliverOne());
    }
    @Test void concurrentMailWorkersSendOneSummaryAndCommitOneSetOfLinks() throws Exception {
        assertEquals(200, request(first, "POST", "auth/forgot-password", Map.of("email", actor.getCorreo())).statusCode());
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> left = () -> { start.await(); return first.getBean(SecurityMailQueue.class).deliverOne(); };
            Callable<Boolean> right = () -> { start.await(); return second.getBean(SecurityMailQueue.class).deliverOne(); };
            var a = pool.submit(left); var b = pool.submit(right); start.countDown();
            assertEquals(1, (a.get(10, TimeUnit.SECONDS) ? 1 : 0) + (b.get(10, TimeUnit.SECONDS) ? 1 : 0));
            verify(EMAIL, times(1)).sendRecoverySummary(eq(actor.getCorreo()), anyString(), anyList());
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM user_tokens WHERE type='PASSWORD_RESET' AND user_id=?", Integer.class, actor.getId()));
        } finally { pool.shutdownNow(); assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS)); }
    }
    @Test void tokenEndpointsAndBootstrapHaveIndependentIpBudgets() throws Exception {
        overrides.put("app.security.limits.token-ip.max", 2);
        assertNotEquals(429, request(first, "POST", "auth/validate-invitation", Map.of("token", "fixture-invalid")).statusCode());
        assertNotEquals(429, request(second, "POST", "auth/verify-email", Map.of("token", "fixture-invalid")).statusCode());
        assertEquals(429, request(first, "POST", "auth/reset-password", Map.of("token", "fixture-invalid", "newPassword", "Changed1!")).statusCode());
        overrides.put("app.security.limits.bootstrap-ip.max", 1);
        var payload = Map.of("nombre", "Prueba Bootstrap", "correo", "bootstrap@example.test", "password", PASSWORD, "rol", "ADMIN");
        assertNotEquals(429, request(first, "POST", "auth/bootstrap-admin", payload).statusCode());
        assertEquals(429, request(second, "POST", "auth/bootstrap-admin", payload).statusCode());
    }
    @Test void failuresFromAnotherOriginDoNotSpendTheLegitimateOriginsFailureBudget() {
        var limiter = first.getBean(SharedSecurityLimiter.class);
        for (int index = 0; index < 3; index++) limiter.check("login-failures", 3, 60, actor.getCorreo() + "|198.51.100.5");
        assertThrows(SecurityLimitException.class, () -> second.getBean(SharedSecurityLimiter.class).checkFailures(actor.getCorreo() + "|198.51.100.5"));
        assertDoesNotThrow(() -> second.getBean(SharedSecurityLimiter.class).checkFailures(actor.getCorreo() + "|203.0.113.8"));
    }
    @Test void countersSurviveBusinessRollbackAndCleanupKeepsLiveWindows() {
        var tx = new org.springframework.transaction.support.TransactionTemplate(first.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        tx.executeWithoutResult(status -> { first.getBean(SharedSecurityLimiter.class).check("rollback", 1, 60, "fixture"); status.setRollbackOnly(); });
        assertThrows(SecurityLimitException.class, () -> second.getBean(SharedSecurityLimiter.class).check("rollback", 1, 60, "fixture"));
        first.getBean(SharedSecurityLimiter.class).purge();
        assertThrows(SecurityLimitException.class, () -> second.getBean(SharedSecurityLimiter.class).check("rollback", 1, 60, "fixture"));
        expireBudgets(); first.getBean(SharedSecurityLimiter.class).purge();
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM security_rate_buckets", Integer.class));
    }
    @Test void warmCounterLatencyIsRecordedWithoutClaimingAProductionBenchmark() {
        List<Long> milliseconds = new ArrayList<>();
        for (int index = 0; index < 100; index++) {
            long started = System.nanoTime();
            (index % 2 == 0 ? first : second).getBean(SharedSecurityLimiter.class).check("latency", 200, 60, "fixture");
            milliseconds.add(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started));
        }
        milliseconds.sort(Long::compareTo);
        System.out.println("PHASE3_WARM_COUNTER requests=100 p50ms=" + milliseconds.get(50) + " p95ms=" + milliseconds.get(94)
                + " maxms=" + milliseconds.get(99));
    }
    @Test void upgradeFrom54PreservesExistingAccountsAndRefreshFamilies() {
        jdbc.execute("CREATE DATABASE phase3_upgrade");
        String url = POSTGRES.getJdbcUrl().replace("/phase3_isolated", "/phase3_upgrade");
        var legacy = new org.springframework.jdbc.datasource.DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword());
        var flyway54 = org.flywaydb.core.Flyway.configure().dataSource(legacy).target("54").load(); flyway54.migrate();
        var before = new JdbcTemplate(legacy);
        Long id = before.queryForObject("INSERT INTO users(code,nombre,correo,password,rol,enabled,account_non_locked) "
                + "VALUES ('USR-UPGRADE','PRUEBA EXISTENTE','legacy-phase3@example.test',?,'SUPER_ADMIN',true,true) RETURNING id", Long.class, hash);
        before.update("INSERT INTO user_tokens(user_id,type,token_hash,csrf_token_hash,token_family_id,expires_at) "
                + "VALUES (?,'REFRESH_TOKEN',?,?,?,CURRENT_TIMESTAMP+interval '1 day')", id, "a".repeat(64), "b".repeat(64), UUID.randomUUID());
        var upgrade = org.flywaydb.core.Flyway.configure().dataSource(legacy).load();
        assertEquals(1, upgrade.migrate().migrationsExecuted); upgrade.validate();
        assertEquals(hash, before.queryForObject("SELECT password FROM users WHERE id=?", String.class, id));
        assertEquals(1, before.queryForObject("SELECT count(*) FROM user_tokens WHERE user_id=? AND revoked_at IS NULL", Integer.class, id));
        assertEquals(0, before.queryForObject("SELECT count(*) FROM security_rate_buckets", Integer.class));
        assertEquals(0, upgrade.migrate().migrationsExecuted);
        System.out.println("PHASE3_UPGRADE V54_to_V58 accountAndRefresh=preserved idempotent=true");
    }

    @Test @Timeout(180)
    void twoSeparateJvmProcessesShareAnAtomicHttpIpBudget() throws Exception {
        var directory = java.nio.file.Files.createDirectories(java.nio.file.Path.of("build", "phase3-processes"));
        var leftPort = directory.resolve("left.port"); var rightPort = directory.resolve("right.port");
        java.nio.file.Files.deleteIfExists(leftPort); java.nio.file.Files.deleteIfExists(rightPort);
        Process left = fork(directory, "left", leftPort); Process right = null;
        var pool = Executors.newFixedThreadPool(10);
        try {
            right = fork(directory, "right", rightPort);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(120);
            while ((!java.nio.file.Files.exists(leftPort) || !java.nio.file.Files.exists(rightPort)) && System.nanoTime() < deadline) {
                assertTrue(left.isAlive()); assertTrue(right.isAlive()); Thread.sleep(100);
            }
            assertTrue(java.nio.file.Files.exists(leftPort)); assertTrue(java.nio.file.Files.exists(rightPort));
            int a = Integer.parseInt(java.nio.file.Files.readString(leftPort));
            int b = Integer.parseInt(java.nio.file.Files.readString(rightPort)); assertNotEquals(a, b);
            var gate = new CountDownLatch(1); List<Future<Integer>> calls = new ArrayList<>();
            for (int index = 0; index < 20; index++) {
                int port = index % 2 == 0 ? a : b; int number = index;
                calls.add(pool.submit(() -> {
                    gate.await();
                    var call = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/auth/login"))
                            .header("Content-Type", "application/json").header("X-Forwarded-For", "198.51.100." + number)
                            .timeout(java.time.Duration.ofSeconds(15)).POST(HttpRequest.BodyPublishers.ofString(
                                    json.writeValueAsString(Map.of("correo", "fork-" + number + "@example.test", "password", PASSWORD)))).build();
                    return http.send(call, HttpResponse.BodyHandlers.discarding()).statusCode();
                }));
            }
            gate.countDown(); int admitted = 0; int rejected = 0;
            for (var call : calls) { int status = call.get(20, TimeUnit.SECONDS); if (status == 401) admitted++; else if (status == 429) rejected++; }
            assertEquals(4, admitted); assertEquals(16, rejected);
            System.out.println("PHASE3_SEPARATE_JVMS processes=2 httpRequests=20 admitted=4 rejected429=16 forgedHeaders=ineffective");
        } finally {
            pool.shutdownNow(); assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
            left.destroyForcibly(); left.waitFor(15, TimeUnit.SECONDS);
            if (right != null) { right.destroyForcibly(); right.waitFor(15, TimeUnit.SECONDS); }
        }
    }
    Process fork(java.nio.file.Path directory, String name, java.nio.file.Path port) throws Exception {
        Set<String> entries = new LinkedHashSet<>(Arrays.asList(System.getProperty("java.class.path").split(java.io.File.pathSeparator)));
        for (ClassLoader loader = getClass().getClassLoader(); loader != null; loader = loader.getParent()) {
            if (loader instanceof java.net.URLClassLoader urls) for (var url : urls.getURLs()) entries.add(java.nio.file.Path.of(url.toURI()).toString());
        }
        List<String> arguments = new ArrayList<>(List.of("-Xmx384m", "-cp", String.join(java.io.File.pathSeparator, entries),
                Phase3ForkedServer.class.getName(), port.toAbsolutePath().toString(), "--spring.profiles.active=test", "--server.port=0", "--server.servlet.context-path=",
                "--spring.config.import=", "--logging.level.root=ERROR", "--spring.main.banner-mode=off",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(), "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword(), "--spring.datasource.driver-class-name=org.postgresql.Driver",
                "--spring.jpa.database=postgresql", "--spring.flyway.enabled=true", "--spring.jpa.hibernate.ddl-auto=validate",
                "--app.storage.gcs.enabled=false", "--app.security.mail-worker-enabled=false", "--app.security.limits.login-ip.max=4",
                "--MERCADO_PAGO_ACCESS_TOKEN=", "--MERCADO_PAGO_WEBHOOK_SECRET=", "--MERCADO_PAGO_ORGANIZATION_ID=0",
                "--MERCADO_PAGO_COLLECTOR_ID=", "--MERCADO_PAGO_RETURN_URL=", "--MERCADO_PAGO_WEBHOOK_URL="));
        var file = directory.resolve(name + ".args");
        java.nio.file.Files.writeString(file, arguments.stream().map(value -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"")
                .collect(java.util.stream.Collectors.joining(System.lineSeparator())));
        String binary = System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win") ? "java.exe" : "java";
        return new ProcessBuilder(java.nio.file.Path.of(System.getProperty("java.home"), "bin", binary).toString(), "@" + file.toAbsolutePath())
                .redirectErrorStream(true).redirectOutput(directory.resolve(name + ".log").toFile()).start();
    }
}
