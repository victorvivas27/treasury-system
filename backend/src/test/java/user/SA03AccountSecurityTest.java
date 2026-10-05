package user;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.infrastructure.performance.DashboardPerformanceProbe;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import com.tesoreria.user.config.security.*;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Date;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SA03AccountSecurityTest {
    private final JwtService jwt = new JwtService("test-secret-key-with-at-least-32-characters", 60000L);
    private final UserRepositoryOutPort repository = mock(UserRepositoryOutPort.class);
    private final TokenRevocationService revocations = new TokenRevocationService();
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt,
            new CustomUserDetailsService(repository), revocations, mock(RefreshTokenService.class),
            mock(DashboardPerformanceProbe.class));

    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    @Test void httpResolvesBDespiteSameEmailAndLowerIdA() throws Exception {
        when(repository.findById(20L)).thenReturn(Optional.of(user(20L, 2L, RoleEnum.USER)));
        assertEquals(200, request(jwt.generateToken(details(20L, 2L, RoleEnum.USER))));
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var principal = (TenantUserDetails) auth.getPrincipal();
        assertEquals(20L, principal.getUserId()); assertEquals(2L, principal.getOrganizationId());
        assertEquals("ROLE_USER", auth.getAuthorities().iterator().next().getAuthority());
        verify(repository, never()).findByCorreo(anyString());
        verify(repository, never()).findAllByCorreo(anyString());
    }

    @Test void httpRejectsMixedTenantMissingIdAndUnknownAccount() throws Exception {
        when(repository.findById(10L)).thenReturn(Optional.of(user(10L, 1L, RoleEnum.ADMIN)));
        assertEquals(401, request(jwt.generateToken(details(10L, 2L, RoleEnum.ADMIN))));
        assertEquals(401, request(jwt.generateToken(org.springframework.security.core.userdetails.User
                .withUsername("same@mail.com").password("x").roles("ADMIN").build())));
        assertEquals(401, request(jwt.generateToken(details(99L, 2L, RoleEnum.USER))));
        verify(repository, never()).findByCorreo(anyString());
        verify(repository, never()).findAllByCorreo(anyString());
    }

    @Test void httpAllowsOnlyMatchingGlobalSuperAdminForNullTenant() throws Exception {
        when(repository.findById(30L)).thenReturn(Optional.of(user(30L, null, RoleEnum.SUPER_ADMIN)));
        assertEquals(200, request(jwt.generateToken(details(30L, null, RoleEnum.SUPER_ADMIN))));
        SecurityContextHolder.clearContext();
        assertEquals(401, request(jwt.generateToken(details(30L, 2L, RoleEnum.SUPER_ADMIN))));
        when(repository.findById(20L)).thenReturn(Optional.of(user(20L, null, RoleEnum.USER)));
        assertEquals(401, request(jwt.generateToken(details(20L, null, RoleEnum.USER))));
    }

    @Test void selfUsesAccountIdAndOrganizationNotEmail() {
        var authorization = new UserAuthorization(repository);
        var b = details(20L, 2L, RoleEnum.USER);
        var authentication = new UsernamePasswordAuthenticationToken(b, null, b.getAuthorities());
        assertFalse(authorization.isSelf(10L, authentication));
        when(repository.findById(20L)).thenReturn(Optional.of(user(20L, 2L, RoleEnum.USER)));
        assertTrue(authorization.isSelf(20L, authentication));
        when(repository.findById(20L)).thenReturn(Optional.of(user(20L, 1L, RoleEnum.USER)));
        assertFalse(authorization.isSelf(20L, authentication));
    }

    @Test void revokingADoesNotRevokeB() {
        var issuedAt = new Date(System.currentTimeMillis() - 1000);
        revocations.revokeAllForUser(10L);
        assertTrue(revocations.isUserRevokedAfter(10L, issuedAt));
        assertFalse(revocations.isUserRevokedAfter(20L, issuedAt));
    }

    private int request(String token) throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/auth/me");
        request.addHeader("Authorization", "Bearer " + token);
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> response.setStatus(
                SecurityContextHolder.getContext().getAuthentication() == null ? 401 : 200));
        return response.getStatus();
    }
    private TenantUserDetails details(Long id, Long organization, RoleEnum role) {
        return new TenantUserDetails(id, organization, "same@mail.com", "x", role, true, true);
    }
    private User user(Long id, Long organization, RoleEnum role) {
        var user = new User(id, "USR-" + id, "Persona Prueba", "same@mail.com", "$2a$hash",
                role, true, true, null, null);
        user.setOrganizationId(organization); user.setEmailVerifiedAt(java.time.LocalDateTime.now());
        return user;
    }
}
