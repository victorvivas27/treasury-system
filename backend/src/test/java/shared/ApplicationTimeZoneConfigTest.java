package com.tesoreria.shared.infrastructure.time;

import org.junit.jupiter.api.Test;

import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApplicationTimeZoneConfigTest {
    @Test
    void configure_deberiaUsarZonaHorariaDeChile() {
        ApplicationTimeZoneConfig config = new ApplicationTimeZoneConfig("America/Santiago");

        config.configure();

        assertEquals("America/Santiago", TimeZone.getDefault().getID());
    }
}
