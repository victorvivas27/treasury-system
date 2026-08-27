package com.tesoreria.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.web-push")
public record WebPushProperties(boolean enabled, String publicKey, String privateKey,
                                String subject) {
    public boolean configured() {
        return enabled && publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank()
                && subject != null && !subject.isBlank();
    }
}
