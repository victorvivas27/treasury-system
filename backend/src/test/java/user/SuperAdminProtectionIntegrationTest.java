package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.organization.application.OrganizationService;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Tag("integration")
@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "app.storage.gcs.enabled=false", "spring.datasource.url=jdbc:h2:mem:superadmin;DB_CLOSE_DELAY=-1",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SuperAdminProtectionIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserJpaRepository users;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired OrganizationService organizationService;
    @Autowired UserService service;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @Autowired jakarta.persistence.EntityManager em;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    UserEntity actor;
    UserEntity global;

    @BeforeEach void fixtures() {
        actor = account(RoleEnum.ADMIN, organization());
        global = account(RoleEnum.SUPER_ADMIN, null);
    }
    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest
    @ValueSource(strings = {"delete", "role", "disable", "put-disable", "lock", "edit"})
    void ordinaryAdminCannotMutateGlobalSuperAdmin(String operation) throws Exception {
        var before = jdbc.queryForMap("select * from users where id=?", global.getId());
        mutate(actor, global, operation, 403);
        em.flush();
        assertEquals(before, jdbc.queryForMap("select * from users where id=?", global.getId()));
    }

    @Test void adminCannotPromoteAccountToSuperAdmin() throws Exception {
        UserEntity target = account(RoleEnum.ADMIN, actor.getOrganizationId());
        mvc.perform(patch(path(target) + "/rol").header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isForbidden());
        assertEquals(RoleEnum.ADMIN, users.findById(target.getId()).orElseThrow().getRol());
    }

    @Test void adminCannotCreateSuperAdmin() throws Exception {
        long before = users.count();
        mvc.perform(post("/api/v1/users").header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Persona Prueba\","
                        + "\"correo\":\"new-superadmin@mail.com\",\"password\":\"Password1!\",\"rol\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isForbidden());
        assertEquals(before, users.count());
    }

    @Test void lastSuperAdminCanEditOwnProfileAndStayActive() throws Exception {
        mutate(global, global, "edit", 200);
        assertEquals(1, users.countAvailableSuperAdministratorsExcluding(actor.getId()));
    }

    @Test void superAdminCanCreateAnotherSuperAdmin() throws Exception {
        mvc.perform(post("/api/v1/users").header("Authorization", bearer(global))
                .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Persona Prueba\","
                        + "\"correo\":\"allowed-superadmin@mail.com\",\"password\":\"Password1!\",\"rol\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isCreated());
        assertEquals(2, users.countByRol(RoleEnum.SUPER_ADMIN));
    }

    @ParameterizedTest
    @ValueSource(strings = {"delete", "role", "disable", "put-disable", "lock"})
    void lastAvailableSuperAdminCannotBeRemovedOrRestricted(String operation) throws Exception {
        UserEntity second = account(RoleEnum.SUPER_ADMIN, null);
        second.setEnabled(false);
        users.saveAndFlush(second);
        mutate(global, global, operation, 409);
        assertTrue(users.existsById(global.getId()));
        assertEquals(1, users.countAvailableSuperAdministratorsExcluding(second.getId()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"delete", "role", "disable", "put-disable", "lock", "edit"})
    void superAdminCanManageAnotherWhenBackupRemains(String operation) throws Exception {
        UserEntity second = account(RoleEnum.SUPER_ADMIN, null);
        mutate(global, second, operation, operation.equals("delete") ? 204 : 200);
        em.flush(); em.clear();
        if (operation.equals("delete")) assertFalse(users.existsById(second.getId()));
        else {
            UserEntity saved = users.findById(second.getId()).orElseThrow();
            if (operation.equals("role")) assertEquals(RoleEnum.ADMIN, saved.getRol());
            if (operation.equals("disable")) assertFalse(saved.getEnabled());
            if (operation.equals("put-disable")) assertFalse(saved.getEnabled());
            if (operation.equals("lock")) assertFalse(saved.getAccountNonLocked());
            if (operation.equals("edit")) assertEquals("NOMBRE EDITADO", saved.getNombre());
        }
    }

    @Test void ordinaryAdminRetainsDeletionOfUserInOwnCourse() throws Exception {
        UserEntity target = account(RoleEnum.USER, actor.getOrganizationId());
        mutate(actor, target, "delete", 204);
        em.flush(); em.clear();
        assertFalse(users.existsById(target.getId()));
    }

    @Test void otherCourseRemainsInaccessible() throws Exception {
        UserEntity target = account(RoleEnum.SUPER_ADMIN, organization());
        mutate(actor, target, "delete", 404);
        assertTrue(users.existsById(target.getId()));
    }

    @Test void blockedOrInactiveCourseBackupsDoNotCount() throws Exception {
        UserEntity locked = account(RoleEnum.SUPER_ADMIN, null);
        locked.setAccountNonLocked(false); users.saveAndFlush(locked);
        Long course = organization();
        account(RoleEnum.SUPER_ADMIN, course);
        var org = organizations.findById(course).orElseThrow();
        org.setActive(false); organizations.saveAndFlush(org);
        mutate(global, global, "delete", 409);
    }

    @Test void organizationCannotIndirectlyDeleteOrDisableSuperAdmin() {
        account(RoleEnum.SUPER_ADMIN, actor.getOrganizationId());
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> organizationService.setActive(actor.getOrganizationId(), false));
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> organizationService.delete(actor.getOrganizationId(), "Curso Prueba", "ELIMINAR"));
        assertTrue(organizations.findById(actor.getOrganizationId()).orElseThrow().isActive());
    }

    @Test void serviceProxyDeniesUserDeletionAndRoleChanges() {
        UserEntity user = account(RoleEnum.USER, actor.getOrganizationId());
        var details = details(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
        assertThrows(AccessDeniedException.class, () -> service.delete(global.getId()));
        assertThrows(AccessDeniedException.class,
                () -> service.changeRole(global.getId(), RoleEnum.ADMIN, user.getId()));
        assertTrue(users.existsById(global.getId()));
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentDeletionsCannotRemoveBothSuperAdmins() throws Exception {
        UserEntity second = account(RoleEnum.SUPER_ADMIN, null);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try {
            var first = pool.submit(() -> deleteInNewTransaction(global, start));
            var other = pool.submit(() -> deleteInNewTransaction(second, start));
            start.countDown();
            var results = java.util.List.of(first.get(20, java.util.concurrent.TimeUnit.SECONDS),
                    other.get(20, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(results.contains(204), results.toString());
            assertTrue(results.contains(409), results.toString());
            assertEquals(1, users.countByRol(RoleEnum.SUPER_ADMIN));
        } finally {
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS));
            users.deleteAllById(java.util.List.of(global.getId(), second.getId(), actor.getId()));
            organizations.deleteById(actor.getOrganizationId());
        }
    }

    private int deleteInNewTransaction(UserEntity caller, java.util.concurrent.CountDownLatch start) throws Exception {
        start.await(10, java.util.concurrent.TimeUnit.SECONDS);
        var principal = details(caller);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        try {
            new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                    .executeWithoutResult(ignored -> service.delete(caller.getId()));
            return 204;
        } catch (com.tesoreria.shared.domain.exception.DomainException ex) {
            return ex.getStatus().value();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void mutate(UserEntity caller, UserEntity target, String operation, int expected) throws Exception {
        var request = switch (operation) {
            case "delete" -> delete(path(target));
            case "role" -> patch(path(target) + "/rol").content("{\"rol\":\"ADMIN\"}");
            case "disable" -> patch(path(target) + "/estado").content("{\"activo\":false}");
            case "put-disable" -> put(path(target)).content("{\"nombre\":\"Persona Prueba\",\"correo\":\""
                    + target.getCorreo() + "\",\"enabled\":false}");
            default -> put(path(target)).content("{\"nombre\":\"Nombre Editado\",\"correo\":\""
                    + target.getCorreo() + "\",\"accountNonLocked\":" + !operation.equals("lock") + "}");
        };
        mvc.perform(request.header("Authorization", bearer(caller)).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is(expected));
    }
    private String path(UserEntity user) { return "/api/v1/users/" + user.getId(); }
    private String bearer(UserEntity user) { return "Bearer " + jwt.generateToken(details(user)); }
    private TenantUserDetails details(UserEntity user) {
        return new TenantUserDetails(user.getId(), user.getOrganizationId(), user.getCorreo(),
                user.getPassword(), user.getRol(), true, true);
    }
    private Long organization() {
        var org = new OrganizationEntity();
        org.setName("Curso Prueba"); org.setSlug("protection-" + UUID.randomUUID());
        org.setSchoolYear(2026); org.setActive(true);
        return organizations.saveAndFlush(org).getId();
    }
    private UserEntity account(RoleEnum role, Long organization) {
        var user = new UserEntity();
        user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8));
        user.setNombre("PERSONA PRUEBA"); user.setCorreo(UUID.randomUUID() + "@mail.com");
        user.setPassword("$2a$fixturehash"); user.setRol(role); user.setOrganizationId(organization);
        user.setEnabled(true); user.setAccountNonLocked(true);
        user.setEmailVerifiedAt(java.time.LocalDateTime.now());
        return users.saveAndFlush(user);
    }
}
