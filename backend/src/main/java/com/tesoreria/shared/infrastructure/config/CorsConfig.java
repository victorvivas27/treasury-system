package com.tesoreria.shared.infrastructure.config;

import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.stream.Stream;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public CorsConfig(
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.cors.official-origins}") String officialOrigins,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.allowedOrigins = Stream.of(allowedOrigins, officialOrigins, frontendUrl)
                .flatMap(origins -> Arrays.stream(origins.split(",")))
                .map((@NonNull String s) -> s.trim())  // Explicitly mark parameter as @NonNull
                .filter(origin -> !origin.isBlank())
                .map(CorsConfig::removeTrailingSlash)
                .distinct()
                .toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    private static String removeTrailingSlash(String origin) {
        return origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }
}
