package user;

import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.application.usecase.AuthFlowRateLimiter;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.EmailOutPort;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountRecoveryServiceTest {
    @Mock private UserRepositoryOutPort users;
    @Mock private UserTokenJpaRepository tokens;
    @Mock private EmailOutPort email;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthFlowRateLimiter rateLimiter;
    @Mock private TokenRevocationService revocationService;
    private AccountRecoveryService service;

    @BeforeEach
    void setUp() {
        service = new AccountRecoveryService(users, tokens, email, passwordEncoder,
                rateLimiter, revocationService, "https://app.example");
    }

    @Test
    void forgotPassword_deberiaConservarCodigosAnteriores() {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(user.getCorreo()).thenReturn("user@example.com");
        when(user.getNombre()).thenReturn("User");
        when(users.findByCorreo("user@example.com")).thenReturn(Optional.of(user));
        when(email.sendPasswordResetEmail(anyString(), anyString(), anyString()))
                .thenReturn(true);

        service.forgotPassword("user@example.com");

        verify(tokens, never()).deleteByUserIdAndType(7L, UserTokenType.PASSWORD_RESET);
        verify(tokens).save(any(UserTokenEntity.class));
    }

    @Test
    void resetPassword_deberiaInvalidarTodosLosCodigosDelUsuario() throws Exception {
        String rawToken = "recovery-code";
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(7L);
        token.setType(UserTokenType.PASSWORD_RESET);
        token.setTokenHash(hash);
        token.setExpiresAt(java.time.LocalDateTime.now().plusMinutes(10));
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getCorreo()).thenReturn("user@example.com");
        when(user.getNombre()).thenReturn("User");
        when(user.getPassword()).thenReturn("old-hash");
        when(tokens.findByTokenHashAndType(hash, UserTokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("NuevaClave1!", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("NuevaClave1!")).thenReturn("new-hash");
        when(email.sendPasswordChangedEmail(anyString(), anyString(), any())).thenReturn(true);

        service.resetPassword(rawToken, "NuevaClave1!");

        verify(tokens).deleteByUserIdAndType(7L, UserTokenType.PASSWORD_RESET);
        verify(user).setPassword("new-hash");
    }
}
