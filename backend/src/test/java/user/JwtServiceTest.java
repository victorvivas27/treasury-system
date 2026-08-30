package user;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private JwtService jwtService;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("test-secret-key-with-at-least-32-characters", 60_000L);
        userDetails = User.withUsername("admin@mail.com")
                .password("secret")
                .roles("ADMIN")
                .build();
    }

    @Test
    void generateToken_deberiaCrearTokenValido() {
        String token = jwtService.generateToken(userDetails);
        assertEquals("admin@mail.com", jwtService.extractUsername(token));
        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void generateToken_deberiaCrearUnTokenDistintoEnCadaLogin() {
        String first = jwtService.generateToken(userDetails);
        String second = jwtService.generateToken(userDetails);

        assertNotEquals(first, second);
        assertTrue(jwtService.isTokenValid(second, userDetails));
    }

    @Test
    void isTokenValid_deberiaRechazarOtroUsuario() {
        String token = jwtService.generateToken(userDetails);
        UserDetails other = User.withUsername("other@mail.com").password("secret").roles("USER").build();
        assertFalse(jwtService.isTokenValid(token, other));
    }

    @Test
    void parseToken_deberiaPermitirValidarClaimsYaVerificados() {
        String token = jwtService.generateToken(userDetails);

        JwtService.ParsedToken parsedToken = jwtService.parseToken(token);

        assertEquals("admin@mail.com", parsedToken.username());
        assertNotNull(parsedToken.issuedAt());
        assertNotNull(parsedToken.expiresAt());
        assertTrue(jwtService.isTokenValid(parsedToken, userDetails));
    }

    @Test
    void constructor_deberiaRechazarSecretCorto() {
        assertThrows(IllegalArgumentException.class, () -> new JwtService("short", 60_000L));
    }

    @Test
    void generateToken_deberiaIncluirOrganizacionSinRomperTokensAnteriores() {
        UserDetails tenantUser = new TenantUserDetails(7L, 23L, "tenant@mail.com", "secret",
                RoleEnum.ADMIN, true, true);

        JwtService.ParsedToken parsed = jwtService.parseToken(jwtService.generateToken(tenantUser));

        assertEquals(23L, parsed.organizationId());
        assertNull(jwtService.parseToken(jwtService.generateToken(userDetails)).organizationId());
    }
}
