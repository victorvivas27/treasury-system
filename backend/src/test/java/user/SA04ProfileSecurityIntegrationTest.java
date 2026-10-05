package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.AdminUserUpdate;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "app.storage.gcs.enabled=false", "spring.datasource.url=jdbc:h2:mem:sa04;DB_CLOSE_DELAY=-1",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SA04ProfileSecurityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserJpaRepository users;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtService jwt;
    @Autowired UserService service;
    @Autowired jakarta.persistence.EntityManager entityManager;

    private UserEntity user;
    private UserEntity admin;
    private UserEntity otherAdmin;
    private UserEntity superAdmin;
    private UserEntity targetAdmin;

    @BeforeEach
    void fixtures() {
        Long a = organization();
        Long b = organization();
        user = account(RoleEnum.USER, a);
        admin = account(RoleEnum.ADMIN, a);
        otherAdmin = account(RoleEnum.ADMIN, b);
        superAdmin = account(RoleEnum.SUPER_ADMIN, null);
        targetAdmin = account(RoleEnum.ADMIN, a);
    }

    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void signedJwtCanUpdateAllowedProfileField() throws Exception {
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(profilePath(user)).header("Authorization", "Bearer " + token(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Nuevo Nombre\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("NUEVO NOMBRE"));
        assertEquals("NUEVO NOMBRE", storedName(user));
        assertEquals(before, securitySnapshot(user));
    }

    // Simulate an already accepted authentication so SA-05 cannot mask SA-04.
    // SQL assertions verify persisted account attributes, rather than response DTOs.
    @ParameterizedTest
    @ValueSource(strings = {
            "\"enabled\":true", "\"accountNonLocked\":true",
            "\"enabled\":true,\"accountNonLocked\":true",
            "\"rol\":\"ADMIN\",\"roles\":[\"ADMIN\"],\"authorities\":[\"ROLE_ADMIN\"]",
            "\"organizationId\":999,\"tenantId\":999",
            "\"id\":999,\"userId\":999", "\"code\":\"USR-ATTACK\"",
            "\"emailVerifiedAt\":\"2026-01-01T00:00:00\",\"invitationAcceptedAt\":\"2026-01-01T00:00:00\",\"invitedGuardianId\":999",
            "\"password\":\"AttackPass1!\",\"totpEnabled\":false,\"totpSecret\":\"ATTACK\",\"backupCodes\":\"ATTACK\"",
            "\"correo\":\"attack@mail.com\",\"profileImageUrl\":\"https://attacker.invalid/image\",\"profileImageType\":\"CUSTOM_IMAGE\""
    })
    void acceptedBlockedSessionCannotMassAssign(String injectedFields) throws Exception {
        disableAndLock(user);
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(profilePath(user)).with(authentication(accepted(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Nombre Permitido\"," + injectedFields + "}"))
                .andExpect(status().isOk());
        assertEquals("NOMBRE PERMITIDO", storedName(user));
        assertEquals(before, securitySnapshot(user));
        assertFalse(storedState(user, "enabled"));
        assertFalse(storedState(user, "account_non_locked"));
    }

    @Test
    void signedJwtAndManuallyInjectedJsonCannotChangeAccountSecurity() throws Exception {
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(profilePath(user)).header("Authorization", "Bearer " + token(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Nuevo Nombre\",\"enabled\":false,\"accountNonLocked\":false,"
                                + "\"rol\":\"SUPER_ADMIN\",\"roles\":[\"ADMIN\"],\"organizationId\":999,"
                                + "\"id\":999,\"code\":\"ATTACK\",\"totpEnabled\":false,\"password\":\"AttackPass1!\"}"))
                .andExpect(status().isOk());
        assertEquals("NUEVO NOMBRE", storedName(user));
        assertEquals(before, securitySnapshot(user));
    }

    @Test
    void originalAttackWithoutProfileFieldIsRejectedAndNeverRestoresStates() throws Exception {
        disableAndLock(user);
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(profilePath(user)).with(authentication(accepted(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true,\"accountNonLocked\":true}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put(adminPath(user)).with(authentication(accepted(user)))
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(user, true, true)))
                .andExpect(status().isForbidden());
        assertEquals(before, securitySnapshot(user));
    }

    @Test
    void invalidProfileIsRejectedWithoutPersistence() throws Exception {
        for (String payload : new String[]{"{}", "{\"nombre\":null}", "{\"nombre\":\"A\"}", "{\"nombre\":\"123\"}"}) {
            mvc.perform(put(profilePath(user)).header("Authorization", "Bearer " + token(user))
                            .contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isBadRequest());
        }
        assertEquals("PERSONA PRUEBA", storedName(user));
    }

    @Test
    void selfDoesNotAuthorizeAnotherAccountOrTenantEvenWithSameEmail() throws Exception {
        otherAdmin.setCorreo(user.getCorreo());
        users.saveAndFlush(otherAdmin);
        for (UserEntity target : new UserEntity[]{admin, otherAdmin}) {
            Map<String, Object> before = securitySnapshot(target);
            mvc.perform(put(profilePath(target)).header("Authorization", "Bearer " + token(user))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Nombre Ajeno\"}"))
                    .andExpect(status().isForbidden());
            assertEquals("PERSONA PRUEBA", storedName(target));
            assertEquals(before, securitySnapshot(target));
        }
    }

    @Test
    void userCannotInvokeAdministrativeUpdateStateOrRoleOperations() throws Exception {
        String token = token(user);
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(adminPath(user)).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(user, true, true)))
                .andExpect(status().isForbidden());
        mvc.perform(patch(adminPath(user) + "/estado").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch(adminPath(user) + "/rol").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
        assertEquals(before, securitySnapshot(user));
    }

    @Test
    void adminCanDisableEnableLockAndUnlockThroughExistingOperations() throws Exception {
        String token = token(admin);
        mvc.perform(put(adminPath(targetAdmin)).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(targetAdmin, false, false)))
                .andExpect(status().isOk());
        assertFalse(storedState(targetAdmin, "enabled"));
        assertFalse(storedState(targetAdmin, "account_non_locked"));
        mvc.perform(patch(adminPath(targetAdmin) + "/estado").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":true}"))
                .andExpect(status().isOk());
        assertTrue(storedState(targetAdmin, "enabled"));
        assertFalse(storedState(targetAdmin, "account_non_locked"));
        mvc.perform(put(adminPath(targetAdmin)).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(targetAdmin, true, true)))
                .andExpect(status().isOk());
        assertTrue(storedState(targetAdmin, "enabled"));
        assertTrue(storedState(targetAdmin, "account_non_locked"));
    }

    @Test
    void adminCanBlockAndUnblockActiveUserButCannotBypassInvitationForDisabledUser() throws Exception {
        String token = token(admin);
        for (boolean unlocked : new boolean[]{false, true}) {
            mvc.perform(put(adminPath(user)).header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(adminPayload(user, true, unlocked)))
                    .andExpect(status().isOk());
            assertEquals(unlocked, storedState(user, "account_non_locked"));
        }
        mvc.perform(patch(adminPath(user) + "/estado").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk());
        mvc.perform(put(adminPath(user)).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(user, true, true)))
                .andExpect(status().isForbidden());
        mvc.perform(patch(adminPath(user) + "/estado").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":true}"))
                .andExpect(status().isForbidden());
        assertFalse(storedState(user, "enabled"));
    }

    @Test
    void omittedOrNullAdministrativeStatesPreserveDisabledAndLockedAccount() throws Exception {
        disableAndLock(user);
        Map<String, Object> before = securitySnapshot(user);
        for (String states : new String[]{"", ",\"enabled\":null,\"accountNonLocked\":null"}) {
            mvc.perform(put(adminPath(user)).header("Authorization", "Bearer " + token(admin))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Nombre Editado\",\"correo\":\""
                                    + user.getCorreo() + "\"" + states + "}"))
                    .andExpect(status().isOk());
            assertEquals(before, securitySnapshot(user));
        }
    }

    @Test
    void adminOfAnotherOrganizationCannotEditAccount() throws Exception {
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(adminPath(user)).header("Authorization", "Bearer " + token(otherAdmin))
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(user, false, false)))
                .andExpect(status().isNotFound());
        mvc.perform(patch(adminPath(user) + "/estado").header("Authorization", "Bearer " + token(otherAdmin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isNotFound());
        assertEquals(before, securitySnapshot(user));
    }

    @Test
    void superAdminRetainsGlobalAdministrationAndUsesSameProfileAllowlist() throws Exception {
        mvc.perform(put(adminPath(otherAdmin)).header("Authorization", "Bearer " + token(superAdmin))
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(otherAdmin, false, false)))
                .andExpect(status().isOk());
        assertFalse(storedState(otherAdmin, "enabled"));
        assertFalse(storedState(otherAdmin, "account_non_locked"));
        Map<String, Object> before = securitySnapshot(superAdmin);
        mvc.perform(put(profilePath(superAdmin)).header("Authorization", "Bearer " + token(superAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Nuevo Nombre\",\"enabled\":false,\"rol\":\"USER\",\"organizationId\":999}"))
                .andExpect(status().isOk());
        assertEquals(before, securitySnapshot(superAdmin));
    }

    @Test
    void ordinaryAdminCannotAlterGlobalSuperAdminStates() throws Exception {
        Map<String, Object> before = securitySnapshot(superAdmin);
        mvc.perform(put(adminPath(superAdmin)).header("Authorization", "Bearer " + token(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(adminPayload(superAdmin, false, false)))
                .andExpect(status().isForbidden());
        mvc.perform(patch(adminPath(superAdmin) + "/estado").header("Authorization", "Bearer " + token(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isForbidden());
        assertEquals(before, securitySnapshot(superAdmin));
    }

    @Test
    void administrativeUpdateCannotMassAssignRoleTenantOrInternalSecurityFields() throws Exception {
        Map<String, Object> before = securitySnapshot(user);
        mvc.perform(put(adminPath(user)).header("Authorization", "Bearer " + token(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Nombre Editado\",\"correo\":\""
                                + user.getCorreo() + "\",\"rol\":\"SUPER_ADMIN\",\"organizationId\":999,\"id\":999,"
                                + "\"code\":\"ATTACK\",\"password\":\"AttackPass1!\",\"totpSecret\":\"ATTACK\",\"totpEnabled\":false}"))
                .andExpect(status().isOk());
        assertEquals(before, securitySnapshot(user));
    }

    @Test
    void serviceProxyDeniesUserAdministrativeUpdateEvenWithoutController() {
        SecurityContextHolder.getContext().setAuthentication(accepted(user));
        Map<String, Object> before = securitySnapshot(user);
        assertThrows(AccessDeniedException.class, () -> service.update(user.getId(),
                new AdminUserUpdate("Nombre Editado", user.getCorreo(), true, true), user.getId()));
        assertThrows(AccessDeniedException.class, () -> service.cambiarEstado(user.getId(), true, user.getId()));
        assertThrows(AccessDeniedException.class, () -> service.updateSelfProfile(admin.getId(), "Nombre Ajeno", user.getId()));
        assertEquals(before, securitySnapshot(user));
    }

    @Test
    void unauthenticatedClientCannotUseEitherUpdateContract() throws Exception {
        mvc.perform(put(profilePath(user)).contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Nuevo Nombre\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(adminPath(user)).contentType(MediaType.APPLICATION_JSON).content(adminPayload(user, true, true)))
                .andExpect(status().isUnauthorized());
    }

    private Long organization() {
        var entity = new OrganizationEntity();
        entity.setName("Curso Prueba"); entity.setSlug("sa04-" + UUID.randomUUID());
        entity.setSchoolYear(2026); entity.setActive(true);
        return organizations.saveAndFlush(entity).getId();
    }

    private UserEntity account(RoleEnum role, Long organizationId) {
        var entity = new UserEntity();
        entity.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8));
        entity.setNombre("PERSONA PRUEBA"); entity.setCorreo(UUID.randomUUID() + "@mail.com");
        entity.setPassword("$2a$fixturehash"); entity.setRol(role); entity.setOrganizationId(organizationId);
        entity.setEnabled(true); entity.setAccountNonLocked(true);
        entity.setEmailVerifiedAt(LocalDateTime.now());
        entity.setTotpSecret("FIXTURESECRET"); entity.setTotpEnabled(true); entity.setBackupCodes("fixturecodes");
        return users.saveAndFlush(entity);
    }

    private UsernamePasswordAuthenticationToken accepted(UserEntity entity) {
        var details = new TenantUserDetails(entity.getId(), entity.getOrganizationId(), entity.getCorreo(),
                entity.getPassword(), entity.getRol(), true, true);
        return new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
    }

    private String token(UserEntity entity) { return jwt.generateToken((TenantUserDetails) accepted(entity).getPrincipal()); }
    private String adminPath(UserEntity entity) { return "/api/v1/users/" + entity.getId(); }
    private String profilePath(UserEntity entity) { return adminPath(entity) + "/profile"; }
    private String adminPayload(UserEntity entity, boolean enabled, boolean unlocked) {
        return "{\"nombre\":\"Persona Prueba\",\"correo\":\"" + entity.getCorreo()
                + "\",\"enabled\":" + enabled + ",\"accountNonLocked\":" + unlocked + "}";
    }
    private void disableAndLock(UserEntity entity) {
        entityManager.flush();
        jdbc.update("update users set enabled=false, account_non_locked=false where id=?", entity.getId());
        entityManager.clear();
    }
    private boolean storedState(UserEntity entity, String column) {
        entityManager.flush();
        return Boolean.TRUE.equals(jdbc.queryForObject("select " + column + " from users where id=?", Boolean.class, entity.getId()));
    }
    private String storedName(UserEntity entity) {
        entityManager.flush();
        return jdbc.queryForObject("select nombre from users where id=?", String.class, entity.getId());
    }
    private Map<String, Object> securitySnapshot(UserEntity entity) {
        entityManager.flush();
        return jdbc.queryForMap("select id,code,correo,password,rol,organization_id,enabled,account_non_locked,"
                + "email_verified_at,invitation_accepted_at,invited_guardian_id,created_at,"
                + "totp_secret,totp_enabled,backup_codes,profile_image_type,profile_image_url from users where id=?", entity.getId());
    }
}
