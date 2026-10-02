package treasury;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.apoderado.core.port.in.GetApoderadoUseCase;
import com.tesoreria.familia.application.usecase.FamiliaService;
import com.tesoreria.familia.core.model.FamilyTreasuryData;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.familia.core.port.in.DeleteFamiliaUseCase;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.organization.application.DefaultOrganizationProvider;
import com.tesoreria.organization.config.CurrentTenantIdentifierResolver;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.infrastructure.cache.*;
import com.tesoreria.shared.infrastructure.performance.DashboardPerformanceProbe;
import com.tesoreria.treasury.application.usecase.TreasuryService;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import com.tesoreria.treasury.infrastructure.adapter.in.web.controller.TreasuryController;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real Spring caching proxies and Caffeine; repository data is synthetic, tenant-specific. */
@SpringJUnitConfig(TreasuryTenantCacheIntegrationTest.Config.class)
class TreasuryTenantCacheIntegrationTest {
    private static final int YEAR = 2026;
    @Autowired TreasuryUseCase service;
    @Autowired TreasuryController controller;
    @Autowired DeleteFamiliaUseCase families;
    @Autowired TreasuryRepositoryOutPort repository;
    @Autowired FamiliaRepositoryOutPort familyRepository;
    @Autowired CacheManager caches;
    @Autowired TenantCacheKeys keys;
    private final Map<Long, AnnualFeeConfig> configs = new HashMap<>();
    private final Map<Long, ContributionConfig> contributions = new HashMap<>();

    @BeforeEach
    void prepare() {
        SecurityContextHolder.clearContext();
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        reset(repository, familyRepository);
        for (long org : List.of(11L, 22L)) {
            configs.put(org, config(org, org * 1000));
            contributions.put(org, contribution(org, org * 100));
        }
        when(repository.findConfigByYear(YEAR)).thenAnswer(call -> Optional.of(configs.get(org())));
        when(repository.findAllConfigs()).thenAnswer(call -> List.of(configs.get(org())));
        when(repository.findContributionConfigs(YEAR)).thenAnswer(call -> List.of(contributions.get(org())));
        when(repository.findContributionConfig(YEAR, ContributionType.CEPA))
                .thenAnswer(call -> Optional.of(contributions.get(org())));
        when(repository.saveConfig(any())).thenAnswer(call -> {
            AnnualFeeConfig value = call.getArgument(0);
            configs.put(org(), value);
            return value;
        });
        when(repository.saveContributionConfig(any())).thenAnswer(call -> {
            ContributionConfig value = call.getArgument(0);
            contributions.put(org(), value);
            return value;
        });
        when(repository.findIncomes(YEAR)).thenAnswer(call -> List.of(new TreasuryIncome(org(), YEAR,
                "income-" + org(), BigDecimal.valueOf(org() * 10), LocalDate.of(YEAR, 3, 1),
                IncomeCategory.OTHER, null, IncomePaymentMethod.CASH, null, null, null, null,
                IncomeStatus.ACTIVE, "admin", null, null, null, LocalDateTime.now(), LocalDateTime.now())));
        when(familyRepository.findTreasuryData()).thenAnswer(call ->
                java.util.stream.LongStream.range(0, org().equals(11L) ? 1 : 2)
                        .mapToObj(i -> new FamilyTreasuryData(org() + i, "FA-" + org() + i,
                                org() + i, "student-" + org(), "course-" + org(), "guardian"))
                        .toList());
        when(familyRepository.existsById(anyLong())).thenReturn(true);
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @ParameterizedTest
    @ValueSource(longs = {11, 22})
    void allFiveCachesIsolateBothWarmupOrders(long first) {
        long second = first == 11 ? 22 : 11;
        Map<String, Object> a = readAll(first);
        Map<String, Object> b = readAll(second);
        assertEquals(a, readAll(first));
        assertEquals(b, readAll(second));
        for (String name : caches.getCacheNames()) {
            assertNotEquals(a.get(name), b.get(name), name);
            authenticate(first);
            assertSame(a.get(name), caches.getCache(name).get(cacheKey(name)).get(), name);
            authenticate(second);
            assertSame(b.get(name), caches.getCache(name).get(cacheKey(name)).get(), name);
        }
        verify(repository, times(4)).findConfigByYear(YEAR); // config + overview, once per tenant
        verify(repository, times(2)).findAllConfigs();
        verify(repository, times(2)).findContributionConfigs(YEAR);
        verify(familyRepository, times(2)).findTreasuryData();
        assertEquals(BigDecimal.valueOf(first * 10),
                ((TreasuryDashboardOverview) a.get(CacheNames.TREASURY_DASHBOARD_OVERVIEW)).finances().otherIncome());
    }

    @ParameterizedTest
    @ValueSource(longs = {11, 22})
    void annualAndContributionWritesInvalidateOnlyTheirOrganization(long changed) {
        long other = changed == 11 ? 22 : 11;
        Map<String, Object> before = readAll(changed);
        Map<String, Object> untouched = readAll(other);
        authenticate(changed);
        service.saveConfig(YEAR, BigDecimal.valueOf(90000), AllowedPaymentMode.AMBAS,
                LocalDate.of(YEAR, 4, 1), LocalDate.of(YEAR, 4, 1), LocalDate.of(YEAR, 7, 1), "admin");
        assertNull(caches.getCache(CacheNames.ANNUAL_FEE_CONFIGURATIONS).get(keys.organization()));
        assertNull(caches.getCache(CacheNames.ANNUAL_FEE_CONFIGURATION_BY_YEAR).get(keys.year(YEAR)));
        assertNull(caches.getCache(CacheNames.TREASURY_DASHBOARD_OVERVIEW).get(keys.year(YEAR)));
        assertEquals(BigDecimal.valueOf(90000), service.getConfig(YEAR).annualAmount());
        assertNotEquals(before.get(CacheNames.ANNUAL_FEE_CONFIGURATIONS), service.listConfigs());
        service.saveContributionConfig(YEAR, ContributionType.CEPA, "new-" + changed,
                true, BigDecimal.valueOf(123), "note", "admin");
        assertNull(caches.getCache(CacheNames.CONTRIBUTION_CONFIGURATIONS).get(keys.year(YEAR)));
        assertNull(caches.getCache(CacheNames.CONTRIBUTION_SUMMARY).get(keys.year(YEAR)));
        assertEquals("new-" + changed, service.listContributionConfigs(YEAR).get(0).name());
        Map<String, Object> afterOther = readAll(other);
        untouched.forEach((name, value) -> assertSame(value, afterOther.get(name), name));
        assertEquals(other * 1000, service.getConfig(YEAR).annualAmount().longValue());
    }

    @ParameterizedTest
    @ValueSource(longs = {11, 22})
    void broadTreasuryAndFamilyEvictionsPreserveOtherTenantAndInvalidateAllYears(long changed) {
        long other = changed == 11 ? 22 : 11;
        readAll(changed);
        Map<String, Object> untouched = readAll(other);
        authenticate(changed);
        Cache dashboard = caches.getCache(CacheNames.TREASURY_DASHBOARD_OVERVIEW);
        Cache summary = caches.getCache(CacheNames.CONTRIBUTION_SUMMARY);
        dashboard.put(keys.year(YEAR + 1), "next-year-dashboard");
        summary.put(keys.year(YEAR + 1), "next-year-summary");
        service.deleteFamilyTreasuryData(1L);
        assertNull(dashboard.get(keys.year(YEAR)));
        assertNull(dashboard.get(keys.year(YEAR + 1)));
        assertNull(summary.get(keys.year(YEAR)));
        assertNull(summary.get(keys.year(YEAR + 1)));
        controller.contributionSummary(YEAR);
        families.eliminarFamilia(1L);
        assertNull(summary.get(keys.year(YEAR)));
        Map<String, Object> after = readAll(other);
        untouched.forEach((name, value) -> assertSame(value, after.get(name), name));
    }

    @ParameterizedTest
    @ValueSource(longs = {11, 22})
    void transactionDeferredScopeCarriesCapturedOrganizationForEveryCache(long changed) {
        long other = changed == 11 ? 22 : 11;
        Map<String, Object> changedData = readAll(changed);
        Map<String, Object> otherData = readAll(other);
        authenticate(changed);
        TransactionSynchronizationManager.initSynchronization();
        for (String name : caches.getCacheNames()) {
            caches.getCache(name).evict(keys.scope());
            assertSame(changedData.get(name), caches.getCache(name).get(cacheKey(name)).get());
        }
        // Identity may change before an afterCommit callback: the eviction still targets its captured ID.
        authenticate(other);
        for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
            sync.afterCommit();
        }
        TransactionSynchronizationManager.clearSynchronization();
        otherData.forEach((name, value) -> assertSame(value, caches.getCache(name).get(cacheKey(name)).get()));
        authenticate(changed);
        caches.getCacheNames().forEach(name -> assertNull(caches.getCache(name).get(cacheKey(name))));
    }

    @Test
    void deferredInvalidationDoesNotRunOnRollback() {
        Map<String, Object> data = readAll(11);
        TransactionSynchronizationManager.initSynchronization();
        service.deleteFamilyTreasuryData(1L);
        for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        }
        TransactionSynchronizationManager.clearSynchronization();
        data.forEach((name, value) -> assertSame(value, caches.getCache(name).get(cacheKey(name)).get()));
    }

    @Test
    void everyFinancialCacheAnnotationUsesExplicitTenantKeysAndNoGlobalEviction() {
        for (Class<?> type : List.of(TreasuryService.class, TreasuryController.class, FamiliaService.class)) {
            for (var method : type.getDeclaredMethods()) {
                Cacheable read = method.getAnnotation(Cacheable.class);
                if (read != null) assertTrue(read.key().startsWith("@tenantCacheKeys."), method.toString());
                List<CacheEvict> evictions = new ArrayList<>();
                CacheEvict single = method.getAnnotation(CacheEvict.class);
                if (single != null) evictions.add(single);
                Caching group = method.getAnnotation(Caching.class);
                if (group != null) evictions.addAll(Arrays.asList(group.evict()));
                for (CacheEvict eviction : evictions) {
                    assertFalse(eviction.allEntries(), method.toString());
                    assertTrue(eviction.key().startsWith("@tenantCacheKeys."), method.toString());
                }
            }
        }
    }

    private Map<String, Object> readAll(long tenant) {
        authenticate(tenant);
        return Map.of(CacheNames.ANNUAL_FEE_CONFIGURATIONS, service.listConfigs(),
                CacheNames.ANNUAL_FEE_CONFIGURATION_BY_YEAR, service.getConfig(YEAR),
                CacheNames.CONTRIBUTION_CONFIGURATIONS, service.listContributionConfigs(YEAR),
                CacheNames.TREASURY_DASHBOARD_OVERVIEW, service.dashboardOverview(YEAR),
                CacheNames.CONTRIBUTION_SUMMARY, controller.contributionSummary(YEAR));
    }

    private Object cacheKey(String name) {
        return name.equals(CacheNames.ANNUAL_FEE_CONFIGURATIONS) ? keys.organization() : keys.year(YEAR);
    }

    private Long org() {
        return ((TenantUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .getOrganizationId();
    }

    private void authenticate(long tenant) {
        TenantUserDetails user = new TenantUserDetails(tenant, tenant, "admin-" + tenant + "@example.invalid",
                "unused", RoleEnum.ADMIN, true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private AnnualFeeConfig config(long id, long amount) {
        return new AnnualFeeConfig(id, YEAR, BigDecimal.valueOf(amount), AllowedPaymentMode.AMBAS,
                LocalDate.of(YEAR, 4, 1), LocalDate.of(YEAR, 4, 1), LocalDate.of(YEAR, 7, 1),
                LocalDateTime.now(), LocalDateTime.now());
    }

    private ContributionConfig contribution(long id, long amount) {
        return new ContributionConfig(id, YEAR, ContributionType.CEPA, "config-" + id,
                true, BigDecimal.valueOf(amount), "tenant-" + id, LocalDateTime.now(), LocalDateTime.now());
    }

    @Configuration
    @Import(CacheConfig.class)
    static class Config {
        @Bean CurrentTenantIdentifierResolver tenantResolver() {
            DefaultOrganizationProvider provider = mock(DefaultOrganizationProvider.class);
            when(provider.getId()).thenReturn(1L);
            return new CurrentTenantIdentifierResolver(provider);
        }
        @Bean TreasuryRepositoryOutPort repository() { return mock(TreasuryRepositoryOutPort.class); }
        @Bean FamiliaRepositoryOutPort familyRepository() { return mock(FamiliaRepositoryOutPort.class); }
        @Bean DashboardPerformanceProbe probe() { return mock(DashboardPerformanceProbe.class); }
        @Bean TreasuryService treasury(TreasuryRepositoryOutPort repository, DashboardPerformanceProbe probe) {
            return new TreasuryService(repository, probe);
        }
        @Bean FamiliaService families(FamiliaRepositoryOutPort repository) { return new FamiliaService(repository); }
        @Bean TreasuryController controller(TreasuryUseCase service, GetFamiliaUseCase families,
                                           DashboardPerformanceProbe probe) {
            return new TreasuryController(service, families, mock(AlumnoService.class),
                    mock(GetApoderadoUseCase.class), probe);
        }
    }
}
