package com.tesoreria.shared.infrastructure.time;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.ZoneId;
import java.util.TimeZone;

@Configuration
public class ApplicationTimeZoneConfig {
    public static final String DEFAULT_ZONE = "America/Santiago";
    private final ZoneId zoneId;

    public ApplicationTimeZoneConfig(@Value("${app.time-zone:" + DEFAULT_ZONE + "}") String zone) {
        zoneId = ZoneId.of(zone);
    }

    @PostConstruct
    void configure() {
        TimeZone.setDefault(TimeZone.getTimeZone(zoneId));
    }
}
