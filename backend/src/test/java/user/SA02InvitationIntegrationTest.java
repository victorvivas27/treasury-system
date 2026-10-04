package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.port.out.EmailOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "app.storage.gcs.enabled=false", "spring.datasource.url=jdbc:h2:mem:sa02;DB_CLOSE_DELAY=-1",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SA02InvitationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired ApoderadoJpaRepository guardians;
    @Autowired UserJpaRepository users;
    @Autowired UserTokenJpaRepository tokens;
    @Autowired AccountRecoveryService recovery;
    @Autowired CustomUserDetailsService details;
    @Autowired JwtService jwt;
    @Autowired com.tesoreria.user.config.security.TokenRevocationService revocations;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository students;
    @MockitoBean EmailOutPort email;

    private final ConcurrentHashMap<String, String> links = new ConcurrentHashMap<>();
    private Long courseA;
    private Long courseB;
    private UserEntity adminA;
    private UserEntity adminB;
    private UserEntity ordinary;
    private ApoderadoEntity guardianA;
    private ApoderadoEntity guardianB;
    private ApoderadoEntity inactive;

    @BeforeEach
    void prepare() {
        links.clear();
        when(email.sendPasswordResetEmail(anyString(), anyString(), anyString(), any()))
                .thenAnswer(call -> { links.put(call.getArgument(0), call.getArgument(2)); return true; });
        when(email.sendPasswordChangedEmail(anyString(), anyString(), any(), any())).thenReturn(true);
        when(email.sendVerificationEmail(anyString(), anyString(), anyString(), any())).thenReturn(true);
        courseA = course();
        courseB = course();
        adminA = account(courseA, RoleEnum.ADMIN, true);
        adminB = account(courseB, RoleEnum.ADMIN, true);
        ordinary = account(courseA, RoleEnum.USER, true);
        authenticate(adminA);
        guardianA = guardian("Ana Apoderada", true);
        inactive = guardian("Ana Inactiva", false);
        authenticate(adminB);
        guardianB = guardian("Ana Otrocurso", true);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousCannotRegisterEvenKnowingCourseOrganizationAndAuthorizedEmail() throws Exception {
        long count = users.count();
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(registration(guardianA.getEmail(), courseA))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(registration(guardianB.getEmail(), courseB))).andExpect(status().isUnauthorized());
        assertEquals(count, users.count());
        verifyNoInteractions(email);
    }

    @Test
    void authenticatedActorsCannotUseRegistrationOrCreateUserViaCrud() throws Exception {
        mvc.perform(post("/api/v1/auth/register").header("Authorization", bearer(ordinary))
                .contentType(MediaType.APPLICATION_JSON).content(registration(guardianA.getEmail(), courseA)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/users").header("Authorization", bearer(adminA))
                .contentType(MediaType.APPLICATION_JSON).content(registration(guardianA.getEmail(), courseA)))
                .andExpect(status().isForbidden());
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
    }

    @Test
    void anonymousAndUserCannotIssueInvitation() throws Exception {
        String path = invitePath(guardianA);
        mvc.perform(post(path)).andExpect(status().isUnauthorized());
        mvc.perform(post(path).header("Authorization", bearer(ordinary))).andExpect(status().isForbidden());
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
    }

    @Test
    void adminCanIssueOnlyForActiveGuardianInOwnOrganization() throws Exception {
        mvc.perform(post(invitePath(inactive)).header("Authorization", bearer(adminA)))
                .andExpect(status().isForbidden());
        mvc.perform(post(invitePath(guardianB)).header("Authorization", bearer(adminA)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/apoderados/AP-DEADBEEF/habilitar-acceso")
                .header("Authorization", bearer(adminA))).andExpect(status().isNotFound());
        String raw = invite(guardianA, adminA);
        assertEquals(43, raw.length());
        assertTrue(raw.matches("[A-Za-z0-9_-]+"));
        UserEntity pending = invited(guardianA);
        assertFalse(pending.getEnabled());
        assertEquals(guardianA.getApoderadoId(), pending.getInvitedGuardianId());
        var context = jdbc.queryForMap("SELECT guardian_id, invitation_organization_id, invitation_email, "
                + "token_hash FROM user_tokens WHERE user_id = ? AND type = 'ACCOUNT_INVITATION'", pending.getId());
        assertEquals(guardianA.getApoderadoId(), ((Number) context.get("guardian_id")).longValue());
        assertEquals(courseA, ((Number) context.get("invitation_organization_id")).longValue());
        assertEquals(guardianA.getEmail().toLowerCase(), context.get("invitation_email"));
        assertNotEquals(raw, context.get("token_hash"));
        assertTrue(links.get(guardianA.getEmail()).contains("/aceptar-invitacion?token="));
    }

    @Test
    void adminCannotInvokeServiceWithForeignGuardianId() {
        authenticate(adminA);
        assertThrows(RuntimeException.class, () -> recovery.inviteGuardian(guardianB.getApoderadoId()));
        assertTrue(users.findByCorreoAndOrganizationId(guardianB.getEmail(), courseB).isEmpty());
    }

    @Test
    void sameEmailCanAcceptIndependentInvitationsInTwoCourses() throws Exception {
        authenticate(adminB);
        guardianB.setEmail(guardianA.getEmail());
        guardianB = guardians.saveAndFlush(guardianB);
        SecurityContextHolder.clearContext();

        String firstToken = invite(guardianA, adminA);
        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + firstToken + "\",\"newPassword\":\"Authorized1!\"}"))
                .andExpect(status().isOk());
        String secondToken = invite(guardianB, adminB);
        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + secondToken + "\",\"newPassword\":\"Authorized2!\"}"))
                .andExpect(status().isOk());

        UserEntity first = invited(guardianA);
        UserEntity second = invited(guardianB);
        assertNotEquals(first.getId(), second.getId());
        assertEquals(first.getCorreo(), second.getCorreo());
        assertEquals(courseA, first.getOrganizationId());
        assertEquals(courseB, second.getOrganizationId());
        assertEquals(guardianA.getApoderadoId(), first.getInvitedGuardianId());
        assertEquals(guardianB.getApoderadoId(), second.getInvitedGuardianId());
        assertTrue(first.getEnabled());
        assertTrue(second.getEnabled());
        assertTrue(encoder.matches("Authorized1!", first.getPassword()));
        assertTrue(encoder.matches("Authorized2!", second.getPassword()));
    }

    @Test
    void invitationExplainsAdministrativeEmailConflictInSameCourse() throws Exception {
        UserEntity conflicting = account(courseA, RoleEnum.ADMIN, true);
        conflicting.setCorreo(guardianA.getEmail());
        users.saveAndFlush(conflicting);

        mvc.perform(post(invitePath(guardianA)).header("Authorization", bearer(adminA)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errors.membership").value(
                        "El correo ya corresponde a una cuenta administrativa en este curso."));
        assertTrue(tokens.findAll().stream().noneMatch(token -> conflicting.getId().equals(token.getUserId())));
        verifyNoInteractions(email);
    }

    @Test
    void activeSuperAdminCanIssueAndGuardianCanAcceptInvitationInSessionCourse() throws Exception {
        UserEntity superAdmin = account(courseA, RoleEnum.SUPER_ADMIN, true);
        String raw = invite(guardianA, superAdmin);
        UserEntity pending = invited(guardianA);
        assertEquals(courseA, pending.getOrganizationId());
        assertEquals(guardianA.getApoderadoId(), pending.getInvitedGuardianId());
        assertFalse(pending.getEnabled());
        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + raw + "\",\"newPassword\":\"Authorized1!\"}"))
                .andExpect(status().isOk());
        assertTrue(invited(guardianA).getEnabled());
        assertNotNull(invited(guardianA).getInvitationAcceptedAt());
    }

    @Test
    void superAdminCannotIssueForForeignOrInactiveGuardian() throws Exception {
        UserEntity superAdmin = account(courseA, RoleEnum.SUPER_ADMIN, true);
        mvc.perform(post(invitePath(guardianB)).header("Authorization", bearer(superAdmin)))
                .andExpect(status().isNotFound());
        mvc.perform(post(invitePath(inactive)).header("Authorization", bearer(superAdmin)))
                .andExpect(status().isForbidden());
        authenticate(superAdmin);
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.inviteGuardian(guardianB.getApoderadoId()));
        assertTrue(users.findByCorreoAndOrganizationId(guardianB.getEmail(), courseB).isEmpty());
        verifyNoInteractions(email);
    }

    @Test
    void disabledSuperAdminWithExistingPrincipalCannotIssueInvitation() {
        UserEntity superAdmin = account(courseA, RoleEnum.SUPER_ADMIN, true);
        authenticate(superAdmin);
        superAdmin.setEnabled(false);
        users.saveAndFlush(superAdmin);
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.inviteGuardian(guardianA.getApoderadoId()));
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
        verifyNoInteractions(email);
    }

    @Test
    void blockedSuperAdminWithExistingPrincipalCannotIssueInvitation() {
        UserEntity superAdmin = account(courseA, RoleEnum.SUPER_ADMIN, true);
        authenticate(superAdmin);
        superAdmin.setAccountNonLocked(false);
        users.saveAndFlush(superAdmin);
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.inviteGuardian(guardianA.getApoderadoId()));
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
        verifyNoInteractions(email);
    }

    @Test
    void ordinaryAccountCannotIssueInvitationWithForgedAdminPrincipal() throws Exception {
        authenticate(ordinary);
        TenantUserDetails forged = new TenantUserDetails(ordinary.getId(), courseA,
                ordinary.getCorreo(), ordinary.getPassword(), RoleEnum.ADMIN, true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(forged, null, forged.getAuthorities()));
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.inviteGuardian(guardianA.getApoderadoId()));
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
        verifyNoInteractions(email);
    }

    @Test
    void invitationExplainsOrganizationWithIncorrectType() throws Exception {
        OrganizationEntity organization = organizations.findById(courseA).orElseThrow();
        organization.setType(OrganizationType.SCHOOL);
        organizations.saveAndFlush(organization);

        mvc.perform(post(invitePath(guardianA)).header("Authorization", bearer(adminA)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errors.membership").value(
                        "La organización debe ser de tipo COURSE para habilitar acceso de apoderados."));
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
        verifyNoInteractions(email);
    }

    @Test
    void invitationAllowsActivationAndIgnoresAllClientMembershipIds() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"token":"%s","newPassword":"Authorized1!","organizationId":%d,
                         "courseId":%d,"guardianId":%d,"apoderadoId":%d,"familyId":999999}
                        """.formatted(raw, courseB, courseB, guardianB.getApoderadoId(), guardianB.getApoderadoId())))
                .andExpect(status().isOk());
        UserEntity activated = users.findById(pending.getId()).orElseThrow();
        assertTrue(activated.getEnabled());
        assertNotNull(activated.getInvitationAcceptedAt());
        assertNotNull(activated.getEmailVerifiedAt());
        assertEquals(courseA, activated.getOrganizationId());
        assertEquals(guardianA.getApoderadoId(), activated.getInvitedGuardianId());
        assertEquals(guardianA.getEmail(), activated.getCorreo());
        assertTrue(encoder.matches("Authorized1!", activated.getPassword()));
        var login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + activated.getCorreo() + "\",\"password\":\"Authorized1!\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        String accessToken = com.jayway.jsonpath.JsonPath.read(login.getResponse().getContentAsString(), "$.token");
        assertEquals(courseA, jwt.parseToken(accessToken).organizationId());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + activated.getCorreo() + "\",\"password\":\"Authorized1!\","
                        + "\"organizationId\":" + courseB + "}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/apoderados/" + guardianB.getCodigo()).header("Authorization", bearer(activated)))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonexistentAndManipulatedTokensDoNotChangeCredentials() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        reject(raw + "tampered");
        reject("nonexistent-token");
        assertUnchanged(pending);
    }

    @Test
    void expiredTokenDoesNotChangeCredentials() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("UPDATE user_tokens SET expires_at = ? WHERE token_hash = ?",
                LocalDateTime.now().minusMinutes(1), hash(raw));
        reject(raw);
        assertUnchanged(pending);
    }

    @Test
    void usedAndRevokedTokensAreRejected() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("UPDATE user_tokens SET used_at = ? WHERE token_hash = ?", LocalDateTime.now(), hash(raw));
        reject(raw);
        jdbc.update("UPDATE user_tokens SET used_at = NULL, revoked_at = ? WHERE token_hash = ?",
                LocalDateTime.now(), hash(raw));
        reject(raw);
        assertUnchanged(pending);
    }

    @Test
    void successfulInvitationCannotBeReused() throws Exception {
        String raw = invite(guardianA, adminA);
        recovery.resetPassword(raw, "Authorized1!");
        UserEntity activated = invited(guardianA);
        reject(raw);
        assertEquals(activated.getPassword(), invited(guardianA).getPassword());
    }

    @Test
    void concurrentReuseAllowsExactlyOneSuccessfulActivation() throws Exception {
        String raw = invite(guardianA, adminA);
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            var first = executor.submit(() -> acceptConcurrently(raw, "Concurrent1!", ready, start));
            var second = executor.submit(() -> acceptConcurrently(raw, "Concurrent2!", ready, start));
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            assertEquals(1, first.get(30, TimeUnit.SECONDS) + second.get(30, TimeUnit.SECONDS));
            assertNotNull(invited(guardianA).getInvitationAcceptedAt());
            assertNotNull(jdbc.queryForObject("SELECT used_at FROM user_tokens WHERE token_hash = ?",
                    LocalDateTime.class, hash(raw)));
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void guardianDeactivatedAfterInvitationCannotActivate() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("UPDATE apoderados SET activo = false WHERE apoderado_id = ?", guardianA.getApoderadoId());
        reject(raw);
        assertUnchanged(pending);
    }

    @Test
    void blockedAccountCannotBeUnlockedByInvitation() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("UPDATE users SET account_non_locked = false WHERE id = ?", pending.getId());
        reject(raw);
        assertFalse(invited(guardianA).getAccountNonLocked());
        assertUnchanged(pending);
    }

    @Test
    void administrativeActorDisabledAfterLoginCannotIssueInvitation() throws Exception {
        String authorization = bearer(adminA);
        jdbc.update("UPDATE users SET enabled = false WHERE id = ?", adminA.getId());
        mvc.perform(post(invitePath(guardianA)).header("Authorization", authorization))
                .andExpect(status().isForbidden());
        assertTrue(users.findByCorreoAndOrganizationId(guardianA.getEmail(), courseA).isEmpty());
    }

    @Test
    void deletedGuardianCannotBeReplacedByAnotherWithSameEmail() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("DELETE FROM apoderados WHERE apoderado_id = ?", guardianA.getApoderadoId());
        authenticate(adminA);
        ApoderadoEntity replacement = new ApoderadoEntity(null, code("AP"), "Ana Sustituta",
                guardianA.getEmail(), "12345678", null);
        guardians.save(replacement);
        SecurityContextHolder.clearContext();
        reject(raw);
        assertUnchanged(pending);
    }

    @Test
    void changedEmailOrOrganizationCannotChangeInvitationAuthorization() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("UPDATE apoderados SET email = ? WHERE apoderado_id = ?",
                "changed-" + guardianA.getEmail(), guardianA.getApoderadoId());
        reject(raw);
        jdbc.update("UPDATE apoderados SET email = ? WHERE apoderado_id = ?",
                guardianA.getEmail(), guardianA.getApoderadoId());
        jdbc.update("UPDATE users SET organization_id = ? WHERE id = ?", courseB, pending.getId());
        reject(raw);
        jdbc.update("UPDATE users SET organization_id = ? WHERE id = ?", courseA, pending.getId());
        assertUnchanged(pending);
    }

    @Test
    void inactiveCourseAndUnboundLegacyInvitationCannotActivate() throws Exception {
        String raw = invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        jdbc.update("UPDATE organizations SET active = false WHERE id = ?", courseA);
        reject(raw);
        jdbc.update("UPDATE organizations SET active = true WHERE id = ?", courseA);
        jdbc.update("UPDATE user_tokens SET guardian_id = NULL, invitation_organization_id = NULL, "
                + "invitation_email = NULL WHERE token_hash = ?", hash(raw));
        reject(raw);
        assertUnchanged(pending);
    }

    @Test
    void emailVerificationCannotAuthorizePendingAccountEvenWithActiveGuardian() throws Exception {
        invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        String raw = legacyToken(pending, UserTokenType.EMAIL_VERIFICATION);
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + raw + "\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.token").doesNotExist());
        assertUnchanged(pending);
    }

    @Test
    void oldEmailVerificationWithoutGuardianCannotActivate() throws Exception {
        UserEntity pending = account(courseA, RoleEnum.USER, false);
        String raw = legacyToken(pending, UserTokenType.EMAIL_VERIFICATION);
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + raw + "\"}"))
                .andExpect(status().isForbidden());
        assertUnchanged(pending);
    }

    @Test
    void verifiedAuthorizedMailboxReturnsNoSessionOrRefreshCookie() throws Exception {
        String invitation = invite(guardianA, adminA);
        recovery.resetPassword(invitation, "Authorized1!");
        UserEntity activated = invited(guardianA);
        String raw = legacyToken(activated, UserTokenType.EMAIL_VERIFICATION);
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + raw + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void forgotPasswordAndOldResetCannotActivatePendingAccount() throws Exception {
        invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        long before = tokens.count();
        mvc.perform(post("/api/v1/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + pending.getCorreo() + "\",\"organizationId\":" + courseA + "}"))
                .andExpect(status().isOk());
        assertEquals(before, tokens.count());
        String raw = legacyToken(pending, UserTokenType.PASSWORD_RESET);
        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + raw + "\",\"newPassword\":\"Changed1!\"}"))
                .andExpect(status().isForbidden());
        assertUnchanged(pending);
    }

    @Test
    void recoveryForActiveAccountChangesPasswordWithoutChangingMembership() throws Exception {
        String invitation = invite(guardianA, adminA);
        recovery.resetPassword(invitation, "Authorized1!");
        UserEntity activated = invited(guardianA);
        recovery.forgotPassword(activated.getCorreo(), courseA);
        String raw = links.get(activated.getCorreo()).split("token=")[1];
        recovery.resetPassword(raw, "Recovered1!");
        UserEntity recovered = invited(guardianA);
        assertTrue(recovered.getEnabled());
        assertEquals(activated.getOrganizationId(), recovered.getOrganizationId());
        assertEquals(activated.getInvitedGuardianId(), recovered.getInvitedGuardianId());
        assertEquals(activated.getInvitationAcceptedAt(), recovered.getInvitationAcceptedAt());
        assertTrue(encoder.matches("Recovered1!", recovered.getPassword()));
    }

    @Test
    void pendingUserCannotBeActivatedThroughProfileOrAdministrativeState() throws Exception {
        invite(guardianA, adminA);
        UserEntity pending = invited(guardianA);
        mvc.perform(put("/api/v1/users/" + pending.getId()).header("Authorization", bearer(adminA))
                .contentType(MediaType.APPLICATION_JSON).content(registration(pending.getCorreo(), courseA)))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/users/" + pending.getId() + "/estado")
                .header("Authorization", bearer(adminA)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"activo\":true}"))
                .andExpect(status().isForbidden());
        assertUnchanged(pending);
    }

    @Test
    void reactivationAlsoRequiresFreshAdministrativeInvitation() throws Exception {
        String first = invite(guardianA, adminA);
        recovery.resetPassword(first, "Authorized1!");
        UserEntity authorized = invited(guardianA);
        mvc.perform(patch("/api/v1/users/" + authorized.getId() + "/estado")
                .header("Authorization", bearer(adminA)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"activo\":false}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/v1/users/" + authorized.getId() + "/estado")
                .header("Authorization", bearer(adminA)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"activo\":true}"))
                .andExpect(status().isForbidden());
        String renewed = invite(guardianA, adminA);
        recovery.resetPassword(renewed, "Renewed1!");
        assertTrue(invited(guardianA).getEnabled());
        assertEquals(authorized.getOrganizationId(), invited(guardianA).getOrganizationId());
    }

    @Test
    void courseCatalogIsNoLongerPublic() throws Exception {
        mvc.perform(get("/api/v1/organizations/login-options")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/organizations/login-options").header("Authorization", bearer(ordinary)))
                .andExpect(status().isForbidden());
    }

    @Test
    void activatedUserReadsBirthdaysOnlyFromAuthorizedCourse() throws Exception {
        authenticate(adminA);
        var own = students.save(new com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity(
                null, code("AL"), "Ana Curso Propio", "Curso A", null, java.time.LocalDate.of(2015, 5, 1)));
        authenticate(adminB);
        var other = students.save(new com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity(
                null, code("AL"), "Ana Otro Curso", "Curso B", null, java.time.LocalDate.of(2015, 5, 1)));
        SecurityContextHolder.clearContext();
        String invitation = invite(guardianA, adminA);
        recovery.resetPassword(invitation, "Authorized1!");
        UserEntity activated = invited(guardianA);
        var response = mvc.perform(get("/api/v1/alumnos/cumpleanos").header("Authorization", bearer(activated)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(response.contains(own.getCodigo()));
        assertFalse(response.contains(other.getCodigo()));
    }

    private int acceptConcurrently(String raw, String password, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent test did not start");
            recovery.resetPassword(raw, password);
            return 1;
        } catch (com.tesoreria.shared.domain.exception.DomainException rejected) {
            return 0;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private void assertUnchanged(UserEntity before) {
        UserEntity after = users.findById(before.getId()).orElseThrow();
        assertEquals(before.getPassword(), after.getPassword());
        assertEquals(before.getEnabled(), after.getEnabled());
        assertEquals(before.getEmailVerifiedAt(), after.getEmailVerifiedAt());
        assertEquals(before.getInvitationAcceptedAt(), after.getInvitationAcceptedAt());
        assertEquals(before.getOrganizationId(), after.getOrganizationId());
    }

    private void reject(String raw) {
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.resetPassword(raw, "Changed1!"));
    }

    private String invite(ApoderadoEntity guardian, UserEntity admin) throws Exception {
        mvc.perform(post(invitePath(guardian)).header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        return links.get(guardian.getEmail().toLowerCase()).split("token=")[1];
    }

    private UserEntity invited(ApoderadoEntity guardian) {
        return users.findByCorreoAndOrganizationId(guardian.getEmail().toLowerCase(), guardian.getOrganizationId())
                .orElseThrow();
    }

    private String invitePath(ApoderadoEntity guardian) {
        return "/api/v1/apoderados/" + guardian.getCodigo() + "/habilitar-acceso";
    }

    private String bearer(UserEntity account) throws InterruptedException {
        // Existing revocation uses millisecond precision; JWT iat uses seconds.
        // Wait for a genuinely post-revocation token, without mocking security.
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        String token = jwt.generateToken(details.loadUserById(account.getId()));
        while (revocations.isUserRevokedAfter(account.getCorreo(), jwt.parseToken(token).issuedAt())) {
            assertTrue(System.nanoTime() < deadline, "A new post-revocation token must become usable");
            Thread.sleep(50);
            token = jwt.generateToken(details.loadUserById(account.getId()));
        }
        return "Bearer " + token;
    }

    private String registration(String address, Long course) {
        return "{\"nombre\":\"Ana Apoderada\",\"correo\":\"" + address + "\",\"password\":\"Password1!\","
                + "\"rol\":\"USER\",\"enabled\":true,\"accountNonLocked\":true,\"organizationId\":" + course + "}";
    }

    private String legacyToken(UserEntity account, UserTokenType type) throws Exception {
        String raw = UUID.randomUUID().toString();
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(account.getId());
        token.setType(type);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        token.setTokenHash(hash(raw));
        tokens.save(token);
        return raw;
    }

    private String hash(String raw) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(raw.getBytes(StandardCharsets.UTF_8)));
    }

    private Long course() {
        OrganizationEntity value = new OrganizationEntity();
        value.setName("SA02 course");
        value.setSlug("sa02-" + UUID.randomUUID());
        value.setType(OrganizationType.COURSE);
        value.setSchoolYear(2026);
        value.setActive(true);
        return organizations.save(value).getId();
    }

    private String code(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private UserEntity account(Long course, RoleEnum role, boolean enabled) {
        UserEntity value = new UserEntity();
        value.setCode(code("USR"));
        value.setNombre("Ana Fixture");
        value.setCorreo(UUID.randomUUID() + "@example.com");
        value.setPassword(encoder.encode("Password1!"));
        value.setRol(role);
        value.setOrganizationId(course);
        value.setEnabled(enabled);
        value.setAccountNonLocked(true);
        if (enabled) value.setEmailVerifiedAt(LocalDateTime.now());
        return users.save(value);
    }

    private void authenticate(UserEntity account) {
        TenantUserDetails principal = new TenantUserDetails(account.getId(), account.getOrganizationId(),
                account.getCorreo(), account.getPassword(), account.getRol(), true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private ApoderadoEntity guardian(String name, boolean active) {
        ApoderadoEntity value = new ApoderadoEntity(null, code("AP"), name,
                UUID.randomUUID() + "@example.com", "12345678", null);
        value.setActivo(active);
        return guardians.save(value);
    }
}
