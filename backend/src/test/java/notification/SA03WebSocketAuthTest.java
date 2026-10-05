package notification;

import com.tesoreria.notification.config.WebSocketAuthInterceptor;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SA03WebSocketAuthTest {
    private final JwtService jwt = new JwtService("test-secret-key-with-at-least-32-characters", 60_000L);
    private final CustomUserDetailsService users = mock(CustomUserDetailsService.class);
    private final TokenRevocationService revocations = new TokenRevocationService();
    private final RefreshTokenService sessions = mock(RefreshTokenService.class);
    private final WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwt, users, revocations, sessions);

    @Test void sameEmailUsesOnlyIdBAndRolesB() {
        var b = account(20L, 2L, RoleEnum.USER);
        when(users.loadUserById(20L)).thenReturn(b);
        var message = connect(jwt.generateToken(b));
        interceptor.preSend(message, null);
        var auth = (Authentication) accessor(message).getUser();
        assertEquals("20", auth.getName());
        assertSame(b, auth.getPrincipal());
        assertEquals(2L, ((TenantUserDetails) auth.getPrincipal()).getOrganizationId());
        assertEquals("ROLE_USER", auth.getAuthorities().iterator().next().getAuthority());
        verify(users, never()).loadUserByUsername(anyString());
        verify(users, never()).loadUserById(10L);
    }

    @Test void rejectsMixedTenantClaims() {
        when(users.loadUserById(10L)).thenReturn(account(10L, 1L, RoleEnum.ADMIN));
        reject(jwt.generateToken(account(10L, 2L, RoleEnum.USER)));
    }

    @Test void rejectsMissingAndUnknownId() {
        reject(jwt.generateToken(User.withUsername("same@mail.com").password("x").roles("USER").build()));
        when(users.loadUserById(99L)).thenThrow(new UsernameNotFoundException("missing"));
        reject(jwt.generateToken(account(99L, 2L, RoleEnum.USER)));
        verify(users, never()).loadUserByUsername(anyString());
    }

    @Test void rejectsMissingInvalidExpiredAndRevokedTokens() {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(connect(null), null));
        reject("bad");
        var b = account(20L, 2L, RoleEnum.USER);
        reject(new JwtService("test-secret-key-with-at-least-32-characters", -1000L).generateToken(b));
        String token = jwt.generateToken(b);
        revocations.revoke(token, jwt.extractExpiration(token));
        reject(token);
    }

    @Test void nullTenantOnlyAllowedForMatchingGlobalSuperAdmin() {
        var global = account(30L, null, RoleEnum.SUPER_ADMIN);
        when(users.loadUserById(30L)).thenReturn(global);
        var message = connect(jwt.generateToken(global));
        interceptor.preSend(message, null);
        assertEquals("30", accessor(message).getUser().getName());
        when(users.loadUserById(20L)).thenReturn(account(20L, null, RoleEnum.USER));
        reject(jwt.generateToken(account(20L, null, RoleEnum.USER)));
        reject(jwt.generateToken(account(30L, 1L, RoleEnum.SUPER_ADMIN)));
    }

    @Test void rejectsDisabledLockedAndInactiveAccounts() {
        for (var b : new TenantUserDetails[] {
                new TenantUserDetails(20L, 2L, "same@mail.com", "x", RoleEnum.USER, false, true),
                new TenantUserDetails(20L, 2L, "same@mail.com", "x", RoleEnum.USER, true, false),
                new TenantUserDetails(20L, 2L, "same@mail.com", "x", RoleEnum.USER, true, true, false)}) {
            when(users.loadUserById(20L)).thenReturn(b);
            reject(jwt.generateToken(b));
        }
    }

    @Test void rejectsRevokedAccountAndSessionFamily() {
        var b = account(20L, 2L, RoleEnum.USER);
        String token = jwt.generateToken(b);
        revocations.revokeAllForUser(20L);
        reject(token);
        reject(jwt.generateToken(account(10L, 1L, RoleEnum.ADMIN), UUID.randomUUID()));
    }

    private void reject(String token) {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(connect(token), null));
    }
    private TenantUserDetails account(Long id, Long organization, RoleEnum role) {
        return new TenantUserDetails(id, organization, "same@mail.com", "x", role, true, true);
    }
    private Message<byte[]> connect(String token) {
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (token != null) accessor.setNativeHeader("Authorization", "Bearer " + token);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
    private StompHeaderAccessor accessor(Message<?> message) {
        return MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
    }
}
