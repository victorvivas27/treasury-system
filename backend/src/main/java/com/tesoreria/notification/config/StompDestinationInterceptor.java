package com.tesoreria.notification.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ExecutorChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

/** Deny by default: clients may only subscribe to their own logical user queues. */
public final class StompDestinationInterceptor implements ExecutorChannelInterceptor {
    private static final String REPLY_DESTINATION = "/app/notifications.reply";
    private final ThreadLocal<SecurityContext> previousContext = new ThreadLocal<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) throw new AccessDeniedException("STOMP requerido");
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) return message;
        if (!(accessor.getUser() instanceof StompAccountAuthentication authentication)
                || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Cuenta WebSocket requerida");
        }
        String destination = accessor.getDestination();
        if (command == StompCommand.SUBSCRIBE) {
            if (!"/user/queue/messages".equals(destination)
                    && !"/user/queue/notifications".equals(destination)) {
                throw new AccessDeniedException("Suscripción no permitida");
            }
        } else if (command == StompCommand.SEND) {
            if (!REPLY_DESTINATION.equals(destination)) {
                throw new AccessDeniedException("Destino no permitido");
            }
        } else if (command != null && command != StompCommand.DISCONNECT
                && command != StompCommand.UNSUBSCRIBE) {
            throw new AccessDeniedException("Comando no permitido");
        }
        return message;
    }

    @Override
    public Message<?> beforeHandle(Message<?> message, MessageChannel channel, MessageHandler handler) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        previousContext.set(SecurityContextHolder.getContext());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        if (accessor != null && accessor.getUser() instanceof StompAccountAuthentication authentication) {
            context.setAuthentication(authentication);
        }
        SecurityContextHolder.setContext(context);
        return message;
    }

    @Override
    public void afterMessageHandled(Message<?> message, MessageChannel channel,
            MessageHandler handler, Exception exception) {
        SecurityContext context = previousContext.get();
        previousContext.remove();
        if (context == null) SecurityContextHolder.clearContext();
        else SecurityContextHolder.setContext(context);
    }
}
