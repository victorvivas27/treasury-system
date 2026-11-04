package user;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
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
        userDetails = new TenantUserDetails(1L, 1L, "admin@mail.com", "secret", RoleEnum.ADMIN, true, true);
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
    void parseToken_deberiaRechazarFirmaDeOtraClave() {
        JwtService otherSigner = new JwtService("another-test-secret-with-at-least-32-characters", 60_000L);
        String token = otherSigner.generateToken(userDetails);

        assertThrows(JwtException.class, () -> jwtService.parseToken(token));
    }

    @Test
    void parseToken_deberiaRechazarTokenExpirado() {
        JwtService expiredSigner = new JwtService("test-secret-key-with-at-least-32-characters", -60_000L);
        String token = expiredSigner.generateToken(userDetails);

        assertThrows(ExpiredJwtException.class, () -> jwtService.parseToken(token));
    }

    @Test
    void parseToken_deberiaRechazarTokenSinFirma() {
        String token = Jwts.builder().subject(userDetails.getUsername()).compact();

        assertThrows(JwtException.class, () -> jwtService.parseToken(token));
    }

    @Test
    void generateToken_deberiaConservarHS256YFamiliaDeSesion() {
        java.util.UUID familyId = java.util.UUID.randomUUID();
        String token = jwtService.generateToken(userDetails, familyId);
        String header = new String(java.util.Base64.getUrlDecoder().decode(token.split("\\.")[0]),
                java.nio.charset.StandardCharsets.UTF_8);

        assertTrue(header.contains("\"alg\":\"HS256\""));
        assertEquals(familyId, jwtService.parseToken(token).tokenFamilyId());
        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void generateToken_deberiaIncluirOrganizacionSinRomperTokensAnteriores() {
        UserDetails tenantUser = new TenantUserDetails(7L, 23L, "tenant@mail.com", "secret",
                RoleEnum.ADMIN, true, true);

        JwtService.ParsedToken parsed = jwtService.parseToken(jwtService.generateToken(tenantUser));

        assertEquals(23L, parsed.organizationId());
        assertEquals(1L, jwtService.parseToken(jwtService.generateToken(userDetails)).organizationId());
    }
}
