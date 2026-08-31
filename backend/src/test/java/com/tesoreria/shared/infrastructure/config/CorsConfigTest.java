package com.tesoreria.shared.infrastructure.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CorsConfigTest {

    @Test
    void addCorsMappings_deberiaRechazarWildcardConCredenciales() {
        CorsConfig config = new CorsConfig("*", "", "http://localhost:5173");

        assertThrows(IllegalStateException.class, () -> config.addCorsMappings(new CorsRegistry()));
    }

    @Test
    void addCorsMappings_deberiaAceptarOrigenesExplicitosDeDesarrolloYProduccion() {
        CorsConfig config = new CorsConfig(
                "http://localhost:5173,http://127.0.0.1:5174",
                "https://tesoreriaescolar.app",
                "https://www.tesoreriaescolar.app/");

        assertDoesNotThrow(() -> config.addCorsMappings(new CorsRegistry()));
    }
}
