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
class TreasuryTenantCachePersistenceTest {
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

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void realDatabaseSeparatesWarmReadsAndCommittedInvalidationsInBothDirections(boolean reverse) {
        Long a = organization();
        Long b = organization();
        setup(a, 70000, 1000, 1);
        setup(b, 80000, 2000, 2);
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        Long first = reverse ? b : a;
        Long second = reverse ? a : b;
        Snapshot firstData = read(first);
        Snapshot secondData = read(second);
        assertEquals(firstData, read(first));
        assertEquals(secondData, read(second));
        assertNotEquals(firstData.config.id(), secondData.config.id());
        assertNotEquals(firstData.contributions.get(0).id(), secondData.contributions.get(0).id());
        assertNotEquals(firstData.dashboard.finances().otherIncome(), secondData.dashboard.finances().otherIncome());
        assertNotEquals(firstData.summary.totalFamilies(), secondData.summary.totalFamilies());
        assertEquals(reverse ? 2 : 1, firstData.summary.totalFamilies());
        assertEquals(reverse ? 1 : 2, secondData.summary.totalFamilies());
        authenticate(first);
        assertEquals(firstData.config.id(), repository.findConfigByYear(YEAR).orElseThrow().id());
        assertSame(firstData.config, service.getConfig(YEAR));
        assertSame(firstData.summary, controller.contributionSummary(YEAR));
        service.saveConfig(YEAR, BigDecimal.valueOf(90000), AllowedPaymentMode.AMBAS,
                date(4), date(4), date(7), "admin");
        assertNull(caches.getCache(CacheNames.ANNUAL_FEE_CONFIGURATIONS).get(keys.organization()));
        assertNull(caches.getCache(CacheNames.ANNUAL_FEE_CONFIGURATION_BY_YEAR).get(keys.year(YEAR)));
        assertEquals(BigDecimal.valueOf(90000), service.getConfig(YEAR).annualAmount());
        service.saveContributionConfig(YEAR, ContributionType.CEPA, "changed", true,
                BigDecimal.valueOf(500), null, "admin");
        assertNull(caches.getCache(CacheNames.CONTRIBUTION_CONFIGURATIONS).get(keys.year(YEAR)));
        assertNull(caches.getCache(CacheNames.CONTRIBUTION_SUMMARY).get(keys.year(YEAR)));
        assertEquals("changed", service.listContributionConfigs(YEAR).get(0).name());
        service.deleteFamilyTreasuryData(999999L);
        assertNull(caches.getCache(CacheNames.TREASURY_DASHBOARD_OVERVIEW).get(keys.year(YEAR)));
        Snapshot remaining = read(second);
        assertSame(secondData.config, remaining.config);
        assertSame(secondData.list, remaining.list);
        assertSame(secondData.contributions, remaining.contributions);
        assertSame(secondData.dashboard, remaining.dashboard);
        assertSame(secondData.summary, remaining.summary);
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
