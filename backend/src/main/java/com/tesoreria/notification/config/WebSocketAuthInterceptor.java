package com.tesoreria.notification.config;

import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.TokenRevocationService;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.AuthenticationException;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final TokenRevocationService revocationService;
    private final RefreshTokenService refreshTokenService;

    public WebSocketAuthInterceptor(JwtService jwtService, CustomUserDetailsService userDetailsService,
            TokenRevocationService revocationService, RefreshTokenService refreshTokenService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.revocationService = revocationService;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) return message;
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer "))
            throw new AccessDeniedException("Autorización WebSocket requerida");
        String token = authorization.substring(7);
        try {
            if (revocationService.isRevoked(token)) throw new AccessDeniedException("JWT revocado");
            JwtService.ParsedToken parsed = jwtService.parseToken(token);
            if (parsed.userId() == null
                    || revocationService.isUserRevokedAfter(parsed.userId(), parsed.issuedAt()))
                throw new AccessDeniedException("JWT revocado");
            if (parsed.tokenFamilyId() != null && !refreshTokenService.isFamilyActive(parsed.tokenFamilyId()))
                throw new AccessDeniedException("Sesión revocada");
            UserDetails details = userDetailsService.loadUserById(parsed.userId());
            if (!jwtService.isTokenValid(parsed, details)) throw new AccessDeniedException("JWT inválido");
            if (!(details instanceof TenantUserDetails tenantUser))
                throw new AccessDeniedException("Identidad de cuenta requerida");
            accessor.setUser(new StompAccountAuthentication(tenantUser));
            return message;
        } catch (JwtException | IllegalArgumentException | AuthenticationException exception) {
            throw new AccessDeniedException("JWT inválido", exception);
        }
    }
}
