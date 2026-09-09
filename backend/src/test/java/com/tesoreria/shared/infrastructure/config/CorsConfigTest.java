package com.tesoreria.shared.infrastructure.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CorsConfigTest {

    @Test
    void addCorsMappings_deberiaRechazarWildcardConCredenciales() {
        CorsConfig config = new CorsConfig("*", "", "", "http://localhost:5173");

        assertThrows(IllegalStateException.class, () -> config.addCorsMappings(new CorsRegistry()));
    }

    @Test
    void addCorsMappings_deberiaAceptarOrigenesExplicitosDeDesarrolloYProduccion() {
        CorsConfig config = new CorsConfig(
                "http://localhost:5173,http://127.0.0.1:5174",
                "https://tesoreriaescolar.app",
                "https://*.trycloudflare.com",
                "https://www.tesoreriaescolar.app/");

        assertDoesNotThrow(() -> config.addCorsMappings(new CorsRegistry()));
    }

    @Test
    void corsConfigurationSource_deberiaAceptarSubdominiosTemporalesDeCloudflare() {
        CorsConfig config = new CorsConfig(
                "http://localhost:5173",
                "https://tesoreriaescolar.app",
                "https://*.trycloudflare.com",
                "https://www.tesoreriaescolar.app/");
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/v1/auth/login");
        request.addHeader("Origin", "https://scratch-assessed-choir-removing.trycloudflare.com");
        request.addHeader("Access-Control-Request-Method", "POST");

        var configuration = config.corsConfigurationSource().getCorsConfiguration(request);

        assertNotNull(configuration);
        assertDoesNotThrow(() -> configuration.checkOrigin(
                "https://scratch-assessed-choir-removing.trycloudflare.com"));
    }
}
