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
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = com.tesoreria.TesoreriaAppApplication.class, properties = {
        "server.servlet.context-path=", "spring.config.import=", "spring.flyway.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:tenant-cache-isolation;DB_CLOSE_DELAY=-1",
        "app.web-push.enabled=false", "app.storage.gcs.enabled=false"
})
@ActiveProfiles("test")
class SA01HttpIsolationTest {
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

    @org.springframework.boot.test.web.server.LocalServerPort int port;
    @Autowired com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository users;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;
    private final java.net.http.HttpClient http = java.net.http.HttpClient.newHttpClient();
    private final tools.jackson.databind.json.JsonMapper json = tools.jackson.databind.json.JsonMapper.builder().build();

    @org.junit.jupiter.api.Test
    void realLoginAndAlternatingHttpReadsKeepAllFinancialCachesIsolated() throws Exception {
        Long a = organization(); Long b = organization();
        setup(a, 70000, 1000, 1); setup(b, 80000, 2000, 2);
        String email = "cache-" + UUID.randomUUID() + "@example.invalid";
        createUser(a, email); createUser(b, email);
        SecurityContextHolder.clearContext();
        String tokenA = login(a, email); String tokenB = login(b, email);
        String[] routes = {"/configuraciones", "/configuraciones/2026", "/aportes/configuraciones?year=2026",
                "/dashboard/overview?year=2026", "/aportes/resumen?year=2026"};
        for (boolean reverse : new boolean[]{false, true}) {
            caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
            for (int round = 0; round < 3; round++) {
                for (Long tenant : reverse ? List.of(b,a,b,a) : List.of(a,b,a,b)) {
                    boolean isA = tenant.equals(a);
                    String token = isA ? tokenA : tokenB;
                    for (int i = 0; i < routes.length; i++) {
                        var value = get(routes[i], token);
                        switch(i) {
                            case 0 -> {
                                assertEquals(1, value.size());
                                assertEquals(isA ? 70000 : 80000, value.get(0).path("annualAmount").asLong());
                                assertEquals(configId(tenant), value.get(0).path("id").asLong());
                            }
                            case 1 -> {
                                assertEquals(isA ? 70000 : 80000, value.path("annualAmount").asLong());
                                assertEquals(configId(tenant), value.path("id").asLong());
                            }
                            case 2 -> {
                                assertEquals(1, value.size());
                                assertEquals(isA ? 7000 : 8000, value.get(0).path("referenceAmount").asLong());
                                assertEquals("tenant-" + tenant, value.get(0).path("name").asText());
                            }
                            case 3 -> {
                                assertEquals(isA ? 1000 : 2000, value.path("finances").path("otherIncome").asLong());
                                for (var movement : value.path("recentMovements"))
                                    assertEquals("tenant-" + tenant, movement.path("description").asText());
                            }
                            case 4 -> assertEquals(isA ? 1 : 2, value.path("totalFamilies").asLong());
                        }
                    }
                }
            }
        }
    }
    private long configId(Long tenant) {
        authenticate(tenant);
        try { return repository.findConfigByYear(YEAR).orElseThrow().id(); }
        finally { SecurityContextHolder.clearContext(); }
    }
    private void createUser(Long tenant, String email) {
        var user = new com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity();
        user.setCode("T-" + UUID.randomUUID().toString().substring(0, 16));
        user.setNombre("Cache tester"); user.setCorreo(email); user.setOrganizationId(tenant);
        user.setPassword(encoder.encode("CacheTest123!")); user.setRol(RoleEnum.ADMIN);
        user.setEnabled(true); user.setAccountNonLocked(true); user.setEmailVerifiedAt(java.time.LocalDateTime.now());
        users.save(user);
    }
    private String login(Long tenant, String email) throws Exception {
        String body = "{\"correo\":\"" + email + "\",\"password\":\"CacheTest123!\",\"organizationId\":" + tenant + "}";
        var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:" + port + "/api/v1/auth/login"))
            .header("Content-Type", "application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(body)).build();
        var response = http.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), "Real login must succeed");
        var value = json.readTree(response.body());
        String token = value.path("token").asText(); assertFalse(token.isBlank());
        return token;
    }
    private tools.jackson.databind.JsonNode get(String route, String token) throws Exception {
        var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:" + port + "/api/v1/tesoreria" + route))
            .header("Authorization", "Bearer " + token).GET().build();
        var response = http.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), route);
        return json.readTree(response.body());
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

