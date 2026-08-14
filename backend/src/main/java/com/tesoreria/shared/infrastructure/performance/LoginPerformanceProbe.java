package com.tesoreria.shared.infrastructure.performance;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class LoginPerformanceProbe {
    private static final Logger LOG = LoggerFactory.getLogger(LoginPerformanceProbe.class);
    private final Statistics statistics;
    private final boolean enabled;

    public LoginPerformanceProbe(EntityManagerFactory entityManagerFactory,
                                 @Value("${app.instrumentation.login:false}") boolean enabled) {
        statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        this.enabled = enabled;
        if (enabled) statistics.setStatisticsEnabled(true);
    }

    public static long now() {
        return System.nanoTime();
    }

    private static long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    public Measurement start() {
        return enabled ? new Measurement(System.nanoTime(), statistics.getPrepareStatementCount())
                : new Measurement();
    }

    public void phase(Measurement measurement, String name, long startedAt) {
        if (measurement.enabled) measurement.phases.put(name, elapsedMillis(startedAt));
    }

    public void finish(Measurement measurement) {
        if (measurement.enabled && LOG.isInfoEnabled()) {
            LOG.info("PERF login totalMs={} phasesMs={} sqlStatements={}",
                    elapsedMillis(measurement.startedAt), measurement.phases,
                    statistics.getPrepareStatementCount() - measurement.statementsBefore);
        }
    }

    public static final class Measurement {
        private final boolean enabled;
        private final long startedAt;
        private final long statementsBefore;
        private final Map<String, Long> phases = new LinkedHashMap<>();

        private Measurement(long startedAt, long statementsBefore) {
            enabled = true;
            this.startedAt = startedAt;
            this.statementsBefore = statementsBefore;
        }

        private Measurement() {
            enabled = false;
            startedAt = 0;
            statementsBefore = 0;
        }
    }
}
