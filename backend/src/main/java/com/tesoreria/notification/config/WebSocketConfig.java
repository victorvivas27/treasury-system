package com.tesoreria.notification.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import java.util.Arrays;
import java.util.stream.Stream;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketAuthInterceptor authInterceptor;
    private final String[] allowedOrigins;

    public WebSocketConfig(WebSocketAuthInterceptor authInterceptor,
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.cors.official-origins}") String officialOrigins,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.authInterceptor = authInterceptor;
        this.allowedOrigins = Stream.of(allowedOrigins, officialOrigins, frontendUrl)
                .flatMap(origins -> Arrays.stream(origins.split(",")))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(WebSocketConfig::removeTrailingSlash)
                .distinct()
                .toArray(String[]::new);
    }
    @Override public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
    @Override public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
    }
    @Override public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }

    private static String removeTrailingSlash(String origin) {
        return origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }
}
