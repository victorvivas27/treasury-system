package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.LoginRateLimiter;
import com.tesoreria.user.config.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private CustomUserDetailsService detailsService;
    @Mock
    private JwtService jwtService;
    @Mock
    private LoginRateLimiter rateLimiter;
    private AuthService service;
    private UserDetails details;

    @BeforeEach
    void setUp() {
        service = new AuthService(authenticationManager, detailsService, jwtService, rateLimiter);
        details = User.withUsername("admin@mail.com").password("hash").roles("ADMIN").build();
    }

    @Test
    void login_deberiaAutenticarLimpiarIntentosYGenerarToken() {
        when(detailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.generateToken(details)).thenReturn("jwt");

        String token = service.login("admin@mail.com", "Password1!");

        assertEquals("jwt", token);
        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("admin@mail.com", "Password1!"));
        verify(rateLimiter).recordSuccess("admin@mail.com");
    }

    @Test
    void login_deberiaRegistrarFalloYOcultarDetalle() {
        when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new BadCredentialsException("bad"));

        assertThrows(DomainException.class, () -> service.login("admin@mail.com", "bad"));
        verify(rateLimiter).recordFailure("admin@mail.com");
    }

    @Test
    void refresh_deberiaRenovarTokenValido() {
        when(jwtService.extractUsername("old")).thenReturn("admin@mail.com");
        when(detailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.isTokenValid("old", details)).thenReturn(true);
        when(jwtService.generateToken(details)).thenReturn("new");
        assertEquals("new", service.refresh("old"));
    }

    @Test
    void refresh_deberiaRechazarTokenInvalido() {
        when(jwtService.extractUsername("old")).thenReturn("admin@mail.com");
        when(detailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.isTokenValid("old", details)).thenReturn(false);
        assertThrows(DomainException.class, () -> service.refresh("old"));
    }
}
