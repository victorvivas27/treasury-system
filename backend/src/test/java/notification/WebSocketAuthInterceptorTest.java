package notification;

import com.tesoreria.notification.config.WebSocketAuthInterceptor;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.TokenRevocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.User;
import java.util.Date;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {
    @Mock JwtService jwtService;
    @Mock CustomUserDetailsService detailsService;
    @Mock TokenRevocationService revocationService;
    @Mock com.tesoreria.user.application.usecase.RefreshTokenService refreshTokenService;
    private WebSocketAuthInterceptor interceptor;

    @BeforeEach void setUp() {
        interceptor = new WebSocketAuthInterceptor(jwtService, detailsService, revocationService, refreshTokenService);
    }
    @Test void rejectsConnectWithoutJwt() {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(connect(null), null));
    }
    @Test void rejectsInvalidJwt() {
        when(jwtService.parseToken("bad")).thenThrow(new io.jsonwebtoken.MalformedJwtException("bad"));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(connect("Bearer bad"), null));
    }
    @Test void associatesAuthenticatedAccountIdAsPrincipal() {
        Date now = new Date();
        JwtService.ParsedToken parsed = new JwtService.ParsedToken("user@example.com", now,
                new Date(now.getTime() + 60_000), 20L, 2L, null);
        var details = new com.tesoreria.organization.config.TenantUserDetails(20L, 2L,
                "user@example.com", "x", com.tesoreria.user.core.constant.RoleEnum.USER, true, true);
        when(jwtService.parseToken("valid")).thenReturn(parsed);
        when(detailsService.loadUserById(20L)).thenReturn(details);
        when(jwtService.isTokenValid(parsed, details)).thenReturn(true);
        Message<?> result = interceptor.preSend(connect("Bearer valid"), null);
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);
        assertNotNull(accessor);
        assertNotNull(accessor.getUser());
        assertEquals("20", accessor.getUser().getName());
    }
    private Message<byte[]> connect(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorization != null) accessor.setNativeHeader("Authorization", authorization);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
