package user;

import com.tesoreria.user.config.security.JwtService;
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
    void isTokenValid_deberiaRechazarOtroUsuario() {
        String token = jwtService.generateToken(userDetails);
        UserDetails other = User.withUsername("other@mail.com").password("secret").roles("USER").build();
        assertFalse(jwtService.isTokenValid(token, other));
    }

    @Test
    void constructor_deberiaRechazarSecretCorto() {
        assertThrows(IllegalArgumentException.class, () -> new JwtService("short", 60_000L));
    }
}
