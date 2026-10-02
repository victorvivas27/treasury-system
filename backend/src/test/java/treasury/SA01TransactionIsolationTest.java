package treasury;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.infrastructure.cache.CacheNames;
import com.tesoreria.shared.infrastructure.cache.TenantCacheKeys;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import com.tesoreria.treasury.infrastructure.adapter.in.web.controller.TreasuryController;
import com.tesoreria.treasury.infrastructure.adapter.in.web.dto.TreasuryDtos.ContributionSummaryResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Real Hibernate tenant filtering, H2, transaction manager, cache proxies and controller. */
@SpringBootTest(classes = com.tesoreria.TesoreriaAppApplication.class, properties = {
        "spring.config.import=", "spring.flyway.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:tenant-cache-isolation;DB_CLOSE_DELAY=-1",
        "app.web-push.enabled=false", "app.storage.gcs.enabled=false"
})
@ActiveProfiles("test")
class SA01TransactionIsolationTest {
    private static final int YEAR = 2026;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired AlumnoJpaRepository students;
    @Autowired FamiliaJpaRepository families;
    @Autowired TreasuryUseCase service;
    @Autowired TreasuryRepositoryOutPort repository;
    @Autowired TreasuryController controller;
    @Autowired CacheManager caches;
    @Autowired TenantCacheKeys keys;

    @AfterEach
    void cleanup() { SecurityContextHolder.clearContext(); }

    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> transactions() {
        return java.util.stream.Stream.of("commit", "rollbackOnly", "exception").flatMap(outcome ->
            java.util.stream.Stream.of(false, true).flatMap(warm ->
                java.util.stream.Stream.of(false, true).map(reverse ->
                    org.junit.jupiter.params.provider.Arguments.of(outcome, warm, reverse))));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("transactions")
    void allFiveCachesRespectTransactionOutcome(String outcome, boolean warm, boolean reverse) {
        Long a = organization(); Long b = organization();
        setup(a, 70000, 1000, 1); setup(b, 80000, 2000, 2);
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        Long changed = reverse ? b : a; Long other = reverse ? a : b;
        Snapshot original = read(changed); Snapshot untouched = read(other);
        authenticate(changed);
        if (!warm) caches.getCacheNames().forEach(name -> caches.getCache(name).evict(keys.scope()));
        Runnable transaction = () -> new org.springframework.transaction.support.TransactionTemplate(transactionManager)
            .executeWithoutResult(status -> {
                setup(changed, 99000, 3000, 1);
                Snapshot pending = read(changed);
                assertEquals(99000, pending.config().annualAmount().longValue());
                assertEquals(99000, pending.list().get(0).annualAmount().longValue());
                assertEquals(9900, pending.contributions().get(0).referenceAmount().longValue());
                assertEquals((reverse ? 2000 : 1000) + 3000, pending.dashboard().finances().otherIncome().longValue());
                assertEquals((reverse ? 2 : 1) + 1, pending.summary().totalFamilies());
                for (String name : caches.getCacheNames()) {
                    Object key = name.equals(CacheNames.ANNUAL_FEE_CONFIGURATIONS) ? keys.organization() : keys.year(YEAR);
                    if (!warm) assertNull(caches.getCache(name).get(key), "Must not publish before commit: " + name);
                }
                if (outcome.equals("exception")) throw new IllegalStateException("deliberate rollback");
                if (outcome.equals("rollbackOnly")) status.setRollbackOnly();
            });
        if (outcome.equals("exception")) assertThrows(IllegalStateException.class, transaction::run);
        else transaction.run();
        Snapshot remaining = read(other);
        assertSame(untouched.config(), remaining.config()); assertSame(untouched.list(), remaining.list());
        assertSame(untouched.contributions(), remaining.contributions());
        assertSame(untouched.dashboard(), remaining.dashboard()); assertSame(untouched.summary(), remaining.summary());
        Snapshot after = read(changed);
        if (!outcome.equals("commit")) assertEquals(original, after);
        else {
            assertEquals(99000, after.config().annualAmount().longValue());
            assertEquals(99000, after.list().get(0).annualAmount().longValue());
            assertEquals(9900, after.contributions().get(0).referenceAmount().longValue());
            assertEquals((reverse ? 2000 : 1000) + 3000, after.dashboard().finances().otherIncome().longValue());
            assertEquals((reverse ? 2 : 1) + 1, after.summary().totalFamilies());
        }
        assertEquals(after.config(), repository.findConfigByYear(YEAR).orElseThrow());
        Snapshot hot = read(changed);
        assertSame(after.config(), hot.config()); assertSame(after.list(), hot.list());
        assertSame(after.contributions(), hot.contributions()); assertSame(after.dashboard(), hot.dashboard());
        assertSame(after.summary(), hot.summary());
    }

    @org.junit.jupiter.api.Test
    void concurrentColdAndHotReadsNeverCrossTenants() throws Exception {
        Long a = organization(); Long b = organization();
        setup(a, 70000, 1000, 1); setup(b, 80000, 2000, 2);
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        var pool = java.util.concurrent.Executors.newFixedThreadPool(8);
        var gate = new java.util.concurrent.CountDownLatch(1);
        try {
            var jobs = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (int i = 0; i < 8; i++) {
                Long tenant = i % 2 == 0 ? a : b;
                jobs.add(pool.submit(() -> {
                    try {
                        gate.await();
                        for (int j = 0; j < 20; j++) {
                            Snapshot value = read(tenant);
                            assertEquals(tenant.equals(a) ? 70000 : 80000, value.config().annualAmount().longValue());
                            assertEquals(tenant.equals(a) ? 70000 : 80000, value.list().get(0).annualAmount().longValue());
                            assertEquals(tenant.equals(a) ? 7000 : 8000, value.contributions().get(0).referenceAmount().longValue());
                            assertEquals(tenant.equals(a) ? 1000 : 2000, value.dashboard().finances().otherIncome().longValue());
                            assertEquals(tenant.equals(a) ? 1 : 2, value.summary().totalFamilies());
                        }
                    } catch (InterruptedException e) { throw new RuntimeException(e); }
                    finally { SecurityContextHolder.clearContext(); }
                }));
            }
            gate.countDown();
            for (var job : jobs) job.get(60, java.util.concurrent.TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
    }
    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"commit", "rollbackOnly", "exception"})
    void concurrentTransactionsNeverPublishPendingState(String outcome) throws Exception {
        Long a = organization(); Long b = organization();
        setup(a, 70000, 1000, 1); setup(b, 80000, 2000, 2);
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        var pending = new java.util.concurrent.CountDownLatch(2);
        var finish = new java.util.concurrent.CountDownLatch(1);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var jobs = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (Long tenant : List.of(a, b)) jobs.add(pool.submit(() -> {
                authenticate(tenant);
                try {
                    new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                        .executeWithoutResult(status -> {
                            setup(tenant, 99000, 3000, 1);
                            Snapshot value = read(tenant);
                            assertEquals(99000, value.config().annualAmount().longValue());
                            pending.countDown();
                            try {
                                if (!finish.await(60, java.util.concurrent.TimeUnit.SECONDS))
                                    throw new AssertionError("Reader did not finish");
                            } catch (InterruptedException e) { throw new RuntimeException(e); }
                            if (outcome.equals("exception")) throw new IllegalStateException("deliberate rollback");
                            if (outcome.equals("rollbackOnly")) status.setRollbackOnly();
                        });
                } catch (IllegalStateException e) {
                    if (!outcome.equals("exception") || !e.getMessage().equals("deliberate rollback")) throw e;
                } finally { SecurityContextHolder.clearContext(); }
            }));
            assertTrue(pending.await(60, java.util.concurrent.TimeUnit.SECONDS), "Both transactions must reach pending reads");
            for (Long tenant : List.of(a, b)) {
                Snapshot visible = read(tenant);
                boolean isA = tenant.equals(a);
                assertEquals(isA ? 70000 : 80000, visible.config().annualAmount().longValue());
                assertEquals(isA ? 70000 : 80000, visible.list().get(0).annualAmount().longValue());
                assertEquals(isA ? 7000 : 8000, visible.contributions().get(0).referenceAmount().longValue());
                assertEquals(isA ? 1000 : 2000, visible.dashboard().finances().otherIncome().longValue());
                assertEquals(isA ? 1 : 2, visible.summary().totalFamilies());
            }
            finish.countDown();
            for (var job : jobs) job.get(60, java.util.concurrent.TimeUnit.SECONDS);
            for (Long tenant : List.of(a, b)) {
                Snapshot visible = read(tenant);
                boolean committed = outcome.equals("commit");
                boolean isA = tenant.equals(a);
                assertEquals(committed ? 99000 : isA ? 70000 : 80000, visible.config().annualAmount().longValue());
                assertEquals(committed ? 99000 : isA ? 70000 : 80000, visible.list().get(0).annualAmount().longValue());
                assertEquals(committed ? 9900 : isA ? 7000 : 8000, visible.contributions().get(0).referenceAmount().longValue());
                assertEquals((isA ? 1000 : 2000) + (committed ? 3000 : 0), visible.dashboard().finances().otherIncome().longValue());
                assertEquals((isA ? 1 : 2) + (committed ? 1 : 0), visible.summary().totalFamilies());
            }
        } finally { finish.countDown(); pool.shutdownNow(); }
    }

    private void setup(Long tenant, long fee, long income, int familyCount) {
        authenticate(tenant);
        for (int i = 0; i < familyCount; i++) {
            AlumnoEntity student = students.save(new AlumnoEntity(null,
                    "AL-" + UUID.randomUUID().toString().substring(0, 8), "student-" + tenant, "1A"));
            families.save(new FamiliaEntity(null, student.getAlumnoId(), null, List.of(), null, null, null));
        }
        service.saveConfig(YEAR, BigDecimal.valueOf(fee), AllowedPaymentMode.AMBAS,
                date(4), date(4), date(7), "admin");
        service.saveContributionConfig(YEAR, ContributionType.CEPA, "tenant-" + tenant, true,
                BigDecimal.valueOf(fee / 10), null, "admin");
        service.createIncome(YEAR, "tenant-" + tenant, BigDecimal.valueOf(income), date(3),
                IncomeCategory.OTHER, null, IncomePaymentMethod.CASH, null, null, null, null, "admin");
    }

    private Snapshot read(Long tenant) {
        authenticate(tenant);
        return new Snapshot(service.getConfig(YEAR), service.listConfigs(), service.listContributionConfigs(YEAR),
                service.dashboardOverview(YEAR), controller.contributionSummary(YEAR));
    }

    private LocalDate date(int month) { return LocalDate.of(YEAR, month, 1); }

    private Long organization() {
        OrganizationEntity value = new OrganizationEntity();
        value.setName("cache-test");
        value.setSlug("cache-" + UUID.randomUUID());
        value.setType(OrganizationType.COURSE);
        value.setActive(true);
        value.setCourseName("cache-test");
        value.setSchoolYear(YEAR);
        return organizations.save(value).getId();
    }

    private void authenticate(Long tenant) {
        TenantUserDetails user = new TenantUserDetails(tenant, tenant, "admin-" + tenant + "@example.invalid",
                "unused", RoleEnum.ADMIN, true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private record Snapshot(AnnualFeeConfig config, List<AnnualFeeConfig> list,
                            List<ContributionConfig> contributions, TreasuryDashboardOverview dashboard,
                            ContributionSummaryResponse summary) { }
}

