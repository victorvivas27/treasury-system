package com.tesoreria.shared.infrastructure.config;

import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;
    private final String[] allowedOriginPatterns;

    public CorsConfig(
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.cors.official-origins}") String officialOrigins,
            @Value("${app.cors.allowed-origin-patterns:}") String allowedOriginPatterns,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.allowedOrigins = Stream.of(allowedOrigins, officialOrigins, frontendUrl)
                .flatMap(origins -> Arrays.stream(origins.split(",")))
                .map((@NonNull String s) -> s.trim())  // Explicitly mark parameter as @NonNull
                .filter(origin -> !origin.isBlank())
                .map(CorsConfig::removeTrailingSlash)
                .distinct()
                .toArray(String[]::new);
        this.allowedOriginPatterns = splitValues(allowedOriginPatterns);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        validateNoWildcard(allowedOrigins);
        validateNoWildcard(allowedOriginPatterns);
        registry.addMapping("/api/v1/**")
                .allowedOrigins(allowedOrigins)
                .allowedOriginPatterns(allowedOriginPatterns)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With")
                .allowCredentials(true);
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        validateNoWildcard(allowedOrigins);
        validateNoWildcard(allowedOriginPatterns);
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins));
        configuration.setAllowedOriginPatterns(List.of(allowedOriginPatterns));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/v1/**", configuration);
        return source;
    }

    private static String removeTrailingSlash(String origin) {
        return origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }

    private static String[] splitValues(String values) {
        return Arrays.stream(values.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(CorsConfig::removeTrailingSlash)
                .distinct()
                .toArray(String[]::new);
    }

    private static void validateNoWildcard(String[] values) {
        if (Arrays.asList(values).contains("*")) {
            throw new IllegalStateException("CORS no puede usar '*' con credenciales habilitadas");
        }
    }
}
