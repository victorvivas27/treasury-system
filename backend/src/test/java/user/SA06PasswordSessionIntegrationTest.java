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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "app.storage.gcs.enabled=false", "spring.datasource.url=jdbc:h2:mem:sa06;DB_CLOSE_DELAY=-1",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SA06PasswordSessionIntegrationTest {
    @Autowired com.tesoreria.user.application.usecase.AccountRecoveryService recovery;
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.tesoreria.user.core.port.out.EmailOutPort email;

    private static final String PASSWORD = "SessionTest1!";
    @Autowired MockMvc mvc;
    @Autowired UserJpaRepository users;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
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

    @BeforeEach
    void fixtures() throws Exception {
        org.mockito.Mockito.when(email.sendPasswordChangedEmail(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any())).thenReturn(true);
        Long a = organization();
        Long b = organization();
        actor = account(RoleEnum.ADMIN, a, UUID.randomUUID() + "@mail.com");
        String sharedEmail = UUID.randomUUID() + "@mail.com";
        target = account(RoleEnum.ADMIN, a, sharedEmail);
        other = account(RoleEnum.ADMIN, b, sharedEmail);
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
    @ValueSource(strings = {"id", "email", "reset"})
    void passwordMutationClosesAllSessionsDurably(String mode) throws Exception {
        UserEntity subject = mode.equals("email") ? actor : target;
        var first = sessions.issueForUserId(subject.getId(), null, null);
        var second = sessions.issueForUserId(subject.getId(), null, null);
        var unaffected = sessions.issueForUserId(other.getId(), null, null);
        String legacy = jwt.generateToken(details.loadUserById(subject.getId()));
        if (mode.equals("reset")) {
            String raw = UUID.randomUUID().toString();
            var reset = new com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity();
            reset.setUserId(subject.getId());
            reset.setType(com.tesoreria.user.core.constant.UserTokenType.PASSWORD_RESET);
            reset.setTokenHash(java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8))));
            reset.setExpiresAt(LocalDateTime.now().plusMinutes(10));
            tokens.saveAndFlush(reset);
            recovery.resetPassword(raw, "UpdatedSession2!");
            assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                    () -> recovery.resetPassword(raw, "AnotherSession3!"));
        } else if (mode.equals("email")) {
            recovery.changePassword(subject.getCorreo(), PASSWORD, "UpdatedSession2!");
        } else {
            recovery.changePassword(subject.getId(), PASSWORD, "UpdatedSession2!");
        }
        var restarted = new RefreshTokenService(tokens, users, details, jwt, sessions.getExpirationSeconds());
        var freshRevocations = new com.tesoreria.user.config.security.TokenRevocationService(users);
        assertTrue(freshRevocations.isUserRevokedAfter(subject.getId(), jwt.parseToken(legacy).issuedAt()));
        assertFalse(freshRevocations.isUserRevokedAfter(other.getId(), jwt.parseToken(unaffected.accessToken()).issuedAt()));
        for (var old : List.of(first, second)) {
            assertFalse(restarted.isFamilyActive(jwt.parseToken(old.accessToken()).tokenFamilyId(), subject.getId()));
            assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                    () -> sessions.rotate(old.refreshToken(), old.csrfToken()));
            me(old.accessToken(), 401);
        }
        me(legacy, 401);
        me(sessions.issueForUserId(subject.getId(), null, null).accessToken(), 200);
        assertTrue(encoder.matches("UpdatedSession2!", users.findById(subject.getId()).orElseThrow().getPassword()));
        assertEquals(0, revokedCount(other.getId()));
        assertNotNull(sessions.rotate(unaffected.refreshToken(), unaffected.csrfToken()));
    }

    @Test
    void failedDeliveryRollsBackPasswordAndPersistentRevocations() {
        var issued = sessions.issueForUserId(target.getId(), null, null);
        org.mockito.Mockito.when(email.sendPasswordChangedEmail(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any())).thenReturn(false);
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.changePassword(target.getId(), PASSWORD, "UpdatedSession2!"));
        var stored = users.findById(target.getId()).orElseThrow();
        assertTrue(encoder.matches(PASSWORD, stored.getPassword()));
        assertNull(stored.getSessionsRevokedAt());
        assertEquals(0, revokedCount(target.getId()));
        assertNotNull(sessions.rotate(issued.refreshToken(), issued.csrfToken()));
    }

    @Test
    void invalidCurrentPasswordPreservesSessions() throws Exception {
        var issued = sessions.issueForUserId(target.getId(), null, null);
        assertThrows(com.tesoreria.shared.domain.exception.DomainException.class,
                () -> recovery.changePassword(target.getId(), "WrongPassword1!", "UpdatedSession2!"));
        assertNull(users.findById(target.getId()).orElseThrow().getSessionsRevokedAt());
        assertEquals(0, revokedCount(target.getId()));
        me(issued.accessToken(), 200);
        assertNotNull(sessions.rotate(issued.refreshToken(), issued.csrfToken()));
    }

    @Test
    void refreshWaitsForPasswordCommitAndCannotReopenSession() throws Exception {
        var issued = sessions.issueForUserId(target.getId(), null, null);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        org.mockito.Mockito.when(email.sendPasswordChangedEmail(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any())).thenAnswer(call -> {
                    entered.countDown();
                    assertTrue(release.await(10, TimeUnit.SECONDS));
                    return true;
                });
        var executor = Executors.newFixedThreadPool(2);
        try {
            var change = executor.submit(() -> recovery.changePassword(target.getId(), PASSWORD, "UpdatedSession2!"));
            assertTrue(entered.await(10, TimeUnit.SECONDS));
            var rotate = executor.submit(() -> sessions.rotate(issued.refreshToken(), issued.csrfToken()));
            assertThrows(TimeoutException.class, () -> rotate.get(200, TimeUnit.MILLISECONDS));
            release.countDown();
            change.get(10, TimeUnit.SECONDS);
            var failure = assertThrows(java.util.concurrent.ExecutionException.class,
                    () -> rotate.get(10, TimeUnit.SECONDS));
            assertInstanceOf(com.tesoreria.shared.domain.exception.DomainException.class, failure.getCause());
            assertEquals(1, revokedCount(target.getId()));
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    private Long organization() {
        var entity = new OrganizationEntity();
        entity.setName("SA06 TEST");
        entity.setSlug("sa06-" + UUID.randomUUID());
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

    private void me(String access, int expectedStatus) throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().is(expectedStatus));
    }

    private int revokedCount(Long id) {
        return jdbc.queryForObject("select count(*) from user_tokens where user_id=? and revoked_at is not null", Integer.class, id);
    }

}
