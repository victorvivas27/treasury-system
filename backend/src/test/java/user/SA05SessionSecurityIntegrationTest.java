package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import jakarta.servlet.http.Cookie;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "app.storage.gcs.enabled=false", "spring.datasource.url=jdbc:h2:mem:sa05;DB_CLOSE_DELAY=-1",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SA05SessionSecurityIntegrationTest {
    private static final String PASSWORD = "SessionTest1!";
    @Autowired MockMvc mvc;
    @Autowired UserJpaRepository users;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService details;
    @Autowired RefreshTokenService sessions;
    @Autowired UserTokenJpaRepository tokens;
    @Autowired PlatformTransactionManager transactions;
    private final List<Long> accountIds = new ArrayList<>();
    private final List<Long> organizationIds = new ArrayList<>();
    private UserEntity actor;
    private UserEntity target;
    private UserEntity other;
    private Session actorSession;

    @BeforeEach
    void fixtures() throws Exception {
        Long a = organization();
        Long b = organization();
        actor = account(RoleEnum.ADMIN, a, UUID.randomUUID() + "@mail.com");
        String sharedEmail = UUID.randomUUID() + "@mail.com";
        target = account(RoleEnum.ADMIN, a, sharedEmail);
        other = account(RoleEnum.ADMIN, b, sharedEmail);
        actorSession = login(actor);
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            for (Long id : accountIds) {
                jdbc.update("delete from user_tokens where user_id=?", id);
                users.deleteById(id);
            }
            users.flush();
            for (Long id : organizationIds) organizations.deleteById(id);
        });
        accountIds.clear();
        organizationIds.clear();
    }

    @ParameterizedTest
    @ValueSource(strings = {"enabled", "accountNonLocked"})
    void administrativeRestrictionRevokesEverySessionAndSurvivesReenable(String field) throws Exception {
        Session first = login(target);
        Session second = login(target);
        Session unaffected = login(other);
        me(first.access(), 200);
        edit(target, Map.of(field, false), 200);
        assertEquals(2, revokedCount(target.getId()));
        var restartedService = new RefreshTokenService(tokens, users, details, jwt, sessions.getExpirationSeconds());
        assertFalse(restartedService.isFamilyActive(jwt.parseToken(first.access()).tokenFamilyId(), target.getId()));
        assertEquals(0, revokedCount(other.getId()));
        for (Session old : List.of(first, second)) {
            me(old.access(), 401);
            refresh(old, 401);
        }
        loginRejected(target);
        me(unaffected.access(), 200);
        refresh(unaffected, 200);
        edit(target, Map.of(field, true), 200);
        for (Session old : List.of(first, second)) {
            me(old.access(), 401);
            refresh(old, 401);
        }
        me(login(target).access(), 200);
    }

    @Test
    void stateEndpointRevokesSessionsAndNoOpProfileEditKeepsHealthySession() throws Exception {
        Session session = login(target);
        edit(target, Map.of(), 200);
        me(session.access(), 200);
        mvc.perform(patch("/api/v1/users/" + target.getId() + "/estado")
                        .header("Authorization", "Bearer " + actorSession.access())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk());
        assertEquals(1, revokedCount(target.getId()));
        me(session.access(), 401);
        refresh(session, 401);
    }

    @ParameterizedTest
    @ValueSource(strings = {"enabled", "account_non_locked", "organization"})
    void liveStateChecksRejectRefreshEvenWithoutAdministrativeRevocation(String field) throws Exception {
        Session old = login(target);
        long count = tokenCount(target.getId());
        if ("organization".equals(field)) {
            jdbc.update("update organizations set active=false where id=?", target.getOrganizationId());
        } else {
            jdbc.update("update users set " + field + "=false where id=?", target.getId());
        }
        me(old.access(), 401);
        refresh(old, 401);
        loginRejected(target);
        assertEquals(count, tokenCount(target.getId()));
        assertEquals(0, jdbc.queryForObject(
                "select count(*) from user_tokens where user_id=? and used_at is not null", Integer.class, target.getId()));
    }

    @Test
    void accessTokenCannotBorrowAnotherAccountsActiveFamily() throws Exception {
        Session session = login(target);
        UUID family = jwt.parseToken(session.access()).tokenFamilyId();
        String mixed = jwt.generateToken(details.loadUserById(other.getId()), family);
        me(mixed, 401);
        me(session.access(), 200);
    }

    @Test
    void ordinaryAdminCannotRevokeAnotherOrganizationsAccount() throws Exception {
        Session session = login(other);
        edit(other, Map.of("accountNonLocked", false), 404);
        assertEquals(0, revokedCount(other.getId()));
        me(session.access(), 200);
        refresh(session, 200);
    }

    @Test
    void ownDeactivationFailureRollsBackWithoutRevokingActorSession() throws Exception {
        edit(actor, Map.of("enabled", false), 409);
        assertEquals(0, revokedCount(actor.getId()));
        me(actorSession.access(), 200);
    }

    @Test
    void verifiedUserMustLogInAgainAfterAdministrativeUnlock() throws Exception {
        UserEntity user = account(RoleEnum.USER, target.getOrganizationId(), UUID.randomUUID() + "@mail.com");
        Session old = login(user);
        edit(user, Map.of("accountNonLocked", false), 200);
        me(old.access(), 401);
        refresh(old, 401);
        edit(user, Map.of("accountNonLocked", true), 200);
        me(old.access(), 401);
        refresh(old, 401);
        me(login(user).access(), 200);
    }

    @Test
    void directIssueRejectsUnverifiedUserAndAllowsGlobalSuperAdmin() {
        UserEntity user = account(RoleEnum.USER, target.getOrganizationId(), UUID.randomUUID() + "@mail.com");
        jdbc.update("update users set email_verified_at=null where id=?", user.getId());
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> sessions.issueForUserId(user.getId(), null, null));
        assertEquals(0, tokenCount(user.getId()));
        UserEntity global = account(RoleEnum.SUPER_ADMIN, null, UUID.randomUUID() + "@mail.com");
        assertNotNull(sessions.issueForUserId(global.getId(), null, null).accessToken());
    }

    @ParameterizedTest
    @ValueSource(strings = {"issue", "rotate"})
    void concurrentIssuanceFinishesBeforeBlockAndItsSessionIsRevoked(String operation) throws Exception {
        Session old = login(target);
        var executor = Executors.newFixedThreadPool(2);
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var blockingStarted = new CountDownLatch(1);
        try {
            var issuance = executor.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                sessions.lockAccount(target.getId());
                locked.countDown();
                await(release);
                return "rotate".equals(operation)
                        ? sessions.rotate(old.refresh().getValue(), old.csrf().getValue())
                        : sessions.issueForUserId(target.getId(), null, null);
            }));
            assertTrue(locked.await(10, TimeUnit.SECONDS));
            var blocking = executor.submit(() -> {
                blockingStarted.countDown();
                edit(target, Map.of("accountNonLocked", false), 200);
                return null;
            });
            assertTrue(blockingStarted.await(10, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> blocking.get(500, TimeUnit.MILLISECONDS));
            release.countDown();
            var issued = issuance.get(15, TimeUnit.SECONDS);
            blocking.get(15, TimeUnit.SECONDS);
            assertNotNull(issued);
            assertEquals(2, revokedCount(target.getId()));
            me(old.access(), 401);
            me(issued.accessToken(), 401);
            assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                    () -> sessions.rotate(issued.refreshToken(), issued.csrfToken()));
            assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                    () -> sessions.issueForUserId(target.getId(), null, null));
        } finally {
            release.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(20, TimeUnit.SECONDS));
        }
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("Test gate timed out");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private Long organization() {
        var entity = new OrganizationEntity();
        entity.setName("SA05 TEST");
        entity.setSlug("sa05-" + UUID.randomUUID());
        entity.setSchoolYear(2026);
        Long id = organizations.saveAndFlush(entity).getId();
        organizationIds.add(id);
        return id;
    }

    private UserEntity account(RoleEnum role, Long organization, String email) {
        var entity = new UserEntity();
        entity.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8));
        entity.setNombre("PERSONA PRUEBA"); entity.setCorreo(email);
        entity.setPassword(encoder.encode(PASSWORD)); entity.setRol(role);
        entity.setOrganizationId(organization); entity.setEnabled(true); entity.setAccountNonLocked(true);
        entity.setEmailVerifiedAt(LocalDateTime.now());
        entity = users.saveAndFlush(entity);
        accountIds.add(entity.getId());
        return entity;
    }

    private Session login(UserEntity user) throws Exception {
        var response = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload(user)))
                .andExpect(status().isOk()).andReturn().getResponse();
        var body = json.readTree(response.getContentAsString());
        assertEquals(user.getId().longValue(), body.path("user").path("id").asLong());
        Cookie refresh = response.getCookie("treasury_refresh");
        Cookie csrf = response.getCookie("treasury_csrf");
        assertNotNull(refresh); assertNotNull(csrf);
        return new Session(body.path("token").asText(), refresh, csrf);
    }

    private String loginPayload(UserEntity user) {
        var payload = new java.util.HashMap<String, Object>();
        payload.put("correo", user.getCorreo()); payload.put("password", PASSWORD);
        if (user.getOrganizationId() != null) payload.put("organizationId", user.getOrganizationId());
        return json.writeValueAsString(payload);
    }

    private void loginRejected(UserEntity user) throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginPayload(user)))
                .andExpect(status().isUnauthorized());
    }

    private void edit(UserEntity user, Map<String, Object> fields, int expectedStatus) throws Exception {
        var payload = new java.util.HashMap<String, Object>(fields);
        payload.put("nombre", user.getNombre()); payload.put("correo", user.getCorreo());
        mvc.perform(put("/api/v1/users/" + user.getId()).header("Authorization", "Bearer " + actorSession.access())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload)))
                .andExpect(status().is(expectedStatus));
    }

    private void me(String access, int expectedStatus) throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().is(expectedStatus));
    }

    private void refresh(Session session, int expectedStatus) throws Exception {
        mvc.perform(post("/api/v1/auth/refresh").cookie(session.refresh(), session.csrf())
                        .header("X-CSRF-Token", session.csrf().getValue()))
                .andExpect(status().is(expectedStatus));
    }

    private int revokedCount(Long id) {
        return jdbc.queryForObject("select count(*) from user_tokens where user_id=? and revoked_at is not null", Integer.class, id);
    }

    private long tokenCount(Long id) {
        return jdbc.queryForObject("select count(*) from user_tokens where user_id=?", Long.class, id);
    }

    private record Session(String access, Cookie refresh, Cookie csrf) { }
}
