package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.LoginRateLimiter;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock
    private UserRepositoryOutPort users;
    @Mock
    private CustomUserDetailsService detailsService;
    @Mock
    private JwtService jwtService;
    @Mock
    private LoginRateLimiter rateLimiter;
    @Mock
    private PasswordEncoder passwordEncoder;
    private AuthService service;
    private UserDetails details;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, detailsService, jwtService, rateLimiter, passwordEncoder);
        details = org.springframework.security.core.userdetails.User
                .withUsername("admin@mail.com").password("hash").roles("ADMIN").build();
    }

    @Test
    void loginShouldAuthenticateByOrganizationAndReturnUserId() {
        var user = domainUser(7L, 4L);
        when(users.findByCorreoAndOrganizationId("admin@mail.com", 4L))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "$2a$hash")).thenReturn(true);
        when(detailsService.loadUserById(7L)).thenReturn(details);
        when(jwtService.generateToken(details)).thenReturn("jwt");

        AuthService.LoginResult result = service.login("admin@mail.com", "Password1!", 4L);

        assertEquals("jwt", result.accessToken());
        assertEquals(7L, result.userId());
        verify(rateLimiter).recordSuccess("admin@mail.com");
    }

    @Test
    void loginShouldRegisterFailureAndHideDetails() {
        when(users.findByCorreoAndOrganizationId("admin@mail.com", 4L))
                .thenReturn(Optional.of(domainUser(7L, 4L)));
        when(passwordEncoder.matches("bad", "$2a$hash")).thenReturn(false);

        assertThrows(DomainException.class, () -> service.login("admin@mail.com", "bad", 4L));
        verify(rateLimiter).recordFailure("admin@mail.com");
    }

    @Test
    void loginWithoutOrganizationShouldAskForCourseWhenPasswordMatchesMultipleUsers() {
        var first = domainUser(7L, 4L);
        var second = domainUser(8L, 5L);
        when(users.findAllByCorreo("admin@mail.com")).thenReturn(List.of(first, second));
        when(passwordEncoder.matches("Password1!", "$2a$hash")).thenReturn(true);
        when(detailsService.loadUserById(7L)).thenReturn(details);
        when(detailsService.loadUserById(8L)).thenReturn(details);

        AuthService.LoginResult result = service.login("admin@mail.com", "Password1!");

        assertEquals(2, result.organizationChoices().size());
        assertEquals(4L, result.organizationChoices().get(0).organizationId());
        assertEquals(5L, result.organizationChoices().get(1).organizationId());
        verify(rateLimiter).recordSuccess("admin@mail.com");
    }

    @Test
    void loginWithoutOrganizationShouldEnterDirectlyWhenOnlyOnePasswordMatches() {
        var first = domainUser(7L, 4L);
        var second = domainUser(8L, 5L);
        second.setPassword("$2a$other");
        when(users.findAllByCorreo("admin@mail.com")).thenReturn(List.of(first, second));
        when(passwordEncoder.matches("Password1!", "$2a$hash")).thenReturn(true);
        when(passwordEncoder.matches("Password1!", "$2a$other")).thenReturn(false);
        when(detailsService.loadUserById(7L)).thenReturn(details);
        when(jwtService.generateToken(details)).thenReturn("jwt");

        AuthService.LoginResult result = service.login("admin@mail.com", "Password1!");

        assertEquals("jwt", result.accessToken());
        assertEquals(7L, result.userId());
    }

    @Test
    void refreshShouldRenewValidToken() {
        when(jwtService.extractUsername("old")).thenReturn("admin@mail.com");
        when(detailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.isTokenValid("old", details)).thenReturn(true);
        when(jwtService.generateToken(details)).thenReturn("new");

        assertEquals("new", service.refresh("old"));
    }

    @Test
    void refreshShouldRejectInvalidToken() {
        when(jwtService.extractUsername("old")).thenReturn("admin@mail.com");
        when(detailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.isTokenValid("old", details)).thenReturn(false);

        assertThrows(DomainException.class, () -> service.refresh("old"));
    }

    private com.tesoreria.user.core.model.User domainUser(Long id, Long organizationId) {
        var user = new com.tesoreria.user.core.model.User(
                id, "USR-001", "Victor Vivas", "admin@mail.com", "$2a$hash",
                RoleEnum.ADMIN, true, true, null, null);
        user.setOrganizationId(organizationId);
        return user;
    }
}
