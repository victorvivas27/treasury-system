package com.tesoreria.shared.infrastructure.observability;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(Flyway.class)
public class MemoryObservabilityConfiguration {
    @Bean
    FlywayMigrationStrategy observedFlywayMigrationStrategy(MemoryObservability observability) {
        return flyway -> {
            observability.observe("flyway_migration_started");
            try {
                flyway.migrate();
                observability.observe("flyway_migration_completed");
            } catch (RuntimeException failure) {
                observability.observe("flyway_migration_failed");
                throw failure;
            }
        };
    }
}
