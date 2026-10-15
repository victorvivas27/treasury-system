package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "app.storage.gcs.enabled=false", "spring.datasource.url=jdbc:h2:mem:sa07;DB_CLOSE_DELAY=-1",
        "app.refresh-token.reuse-grace-seconds=10",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class SA07RefreshReuseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired RefreshTokenService sessions;
    @Autowired UserJpaRepository users;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtService jwt;
    private Long userId;

    @BeforeEach
    void fixture() {
        var user = new UserEntity();
        user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8));
        user.setNombre("PERSONA PRUEBA");
        user.setCorreo(UUID.randomUUID() + "@mail.com");
        user.setPassword("UnusedTest1!");
        user.setRol(RoleEnum.SUPER_ADMIN);
        user.setEnabled(true);
        user.setAccountNonLocked(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userId = users.saveAndFlush(user).getId();
    }

    @AfterEach
    void cleanup() {
        jdbc.update("delete from user_tokens where user_id=?", userId);
        users.deleteById(userId);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void reuseCommitsRevocationAndRejectsSuccessor(boolean legacyOverload) throws Exception {
        var original = issue();
        var successor = sessions.rotate(original.refreshToken(), original.csrfToken());
        var unrelated = issue();
        UUID family = family(original);
        jdbc.update("update user_tokens set used_at=? where token_family_id=? and used_at is not null",
                LocalDateTime.now().minusSeconds(30), family);
        if (legacyOverload) {
            jdbc.update("update user_tokens set csrf_token_hash=null where token_family_id=?", family);
            assertThrows(DomainException.class, () -> sessions.rotate(original.refreshToken()));
        } else {
            assertThrows(DomainException.class,
                    () -> sessions.rotate(original.refreshToken(), original.csrfToken()));
        }
        // No enclosing test transaction: these reads occur after the service proxy has completed.
        assertEquals(2, jdbc.queryForObject(
                "select count(*) from user_tokens where token_family_id=? and revoked_at is not null",
                Integer.class, family));
        assertFalse(sessions.isFamilyActive(family, userId));
        mvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + successor.accessToken()))
                .andExpect(status().isUnauthorized());
        assertThrows(DomainException.class,
                () -> sessions.rotate(successor.refreshToken(), successor.csrfToken()));
        assertTrue(sessions.isFamilyActive(family(unrelated), userId));
        assertNotNull(sessions.rotate(unrelated.refreshToken(), unrelated.csrfToken()));
    }

    @Test
    void graceRejectsReplayButPreservesSuccessor() {
        var original = issue();
        var successor = sessions.rotate(original.refreshToken(), original.csrfToken());
        assertThrows(DomainException.class,
                () -> sessions.rotate(original.refreshToken(), original.csrfToken()));
        assertTrue(sessions.isFamilyActive(family(original), userId));
        assertNotNull(sessions.rotate(successor.refreshToken(), successor.csrfToken()));
    }

    @Test
    void invalidCsrfCannotRevokeFamilyOutsideGrace() {
        var original = issue();
        var successor = sessions.rotate(original.refreshToken(), original.csrfToken());
        jdbc.update("update user_tokens set used_at=? where token_family_id=? and used_at is not null",
                LocalDateTime.now().minusSeconds(30), family(original));
        var failure = assertThrows(DomainException.class,
                () -> sessions.rotate(original.refreshToken(), "wrong-csrf"));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, failure.getStatus());
        assertTrue(sessions.isFamilyActive(family(original), userId));
        assertNotNull(sessions.rotate(successor.refreshToken(), successor.csrfToken()));
    }

    private RefreshTokenService.IssuedTokens issue() {
        return sessions.issueForUserId(userId, null, null);
    }

    private UUID family(RefreshTokenService.IssuedTokens issued) {
        return jwt.parseToken(issued.accessToken()).tokenFamilyId();
    }
}
