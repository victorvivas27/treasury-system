package user;

import com.tesoreria.user.config.security.TokenRevocationService;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenRevocationServiceTest {
    @Test
    void revoke_deberiaInvalidarTokenHastaSuExpiracion() {
        TokenRevocationService service = new TokenRevocationService();
        service.revoke("token", new Date(System.currentTimeMillis() + 60_000));
        assertTrue(service.isRevoked("token"));
    }

    @Test
    void isRevoked_deberiaDescartarTokenExpirado() {
        TokenRevocationService service = new TokenRevocationService();
        service.revoke("token", new Date(System.currentTimeMillis() - 1));
        assertFalse(service.isRevoked("token"));
    }
}
