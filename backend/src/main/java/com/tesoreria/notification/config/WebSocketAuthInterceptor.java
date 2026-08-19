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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final TokenRevocationService revocationService;

    public WebSocketAuthInterceptor(JwtService jwtService, CustomUserDetailsService userDetailsService,
            TokenRevocationService revocationService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.revocationService = revocationService;
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
            if (revocationService.isUserRevokedAfter(parsed.username(), parsed.issuedAt()))
                throw new AccessDeniedException("JWT revocado");
            UserDetails details = userDetailsService.loadUserByUsername(parsed.username());
            if (!jwtService.isTokenValid(parsed, details)) throw new AccessDeniedException("JWT inválido");
            accessor.setUser(new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
            return message;
        } catch (JwtException | IllegalArgumentException exception) {
            throw new AccessDeniedException("JWT inválido", exception);
        }
    }
}
