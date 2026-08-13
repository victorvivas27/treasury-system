package com.tesoreria.shared.infrastructure.performance;

import com.github.benmanes.caffeine.cache.Cache;
import com.tesoreria.shared.infrastructure.cache.CacheNames;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class DashboardPerformanceProbe {
    private static final Logger LOG = LoggerFactory.getLogger(DashboardPerformanceProbe.class);
    private final Statistics statistics;
    private final CacheManager cacheManager;
    private final boolean enabled;

    public DashboardPerformanceProbe(EntityManagerFactory entityManagerFactory,
                                     CacheManager cacheManager,
                                     @Value("${app.instrumentation.dashboard:false}") boolean enabled) {
        this.statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        this.cacheManager = cacheManager;
        this.enabled = enabled;
        if (enabled) statistics.setStatisticsEnabled(true);
    }

    public Measurement start(int year) {
        if (!enabled) return Measurement.disabled();
        return new Measurement(year, System.nanoTime(), statistics.getPrepareStatementCount(),
                statistics.getQueryExecutionCount(), cacheContains(year));
    }

    public void phase(Measurement measurement, String name, long startedAt) {
        if (measurement.enabled) measurement.phases.put(name, elapsedMillis(startedAt));
    }

    public void finish(Measurement measurement) {
        if (measurement.enabled && LOG.isInfoEnabled()) {
            LOG.info("PERF dashboard year={} totalMs={} phasesMs={} sqlStatements={} hqlQueries={} cache={} cacheEntryAfter={}",
                    measurement.year, elapsedMillis(measurement.startedAt), measurement.phases,
                    statistics.getPrepareStatementCount() - measurement.statementsBefore,
                    statistics.getQueryExecutionCount() - measurement.queriesBefore,
                    measurement.cacheEntryBefore ? "HIT" : "MISS", cacheContains(measurement.year));
        }
    }

    public static long now() {
        return System.nanoTime();
    }

    private boolean cacheContains(int year) {
        org.springframework.cache.Cache springCache = cacheManager.getCache(
                CacheNames.TREASURY_DASHBOARD_OVERVIEW);
        if (springCache == null) return false;
        Object nativeCache = springCache.getNativeCache();
        return nativeCache instanceof Cache<?, ?> caffeine && caffeine.asMap().containsKey(year);
    }

    private static long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    public static final class Measurement {
        private final boolean enabled;
        private final int year;
        private final long startedAt;
        private final long statementsBefore;
        private final long queriesBefore;
        private final boolean cacheEntryBefore;
        private final Map<String, Long> phases = new LinkedHashMap<>();

        private Measurement(int year, long startedAt, long statementsBefore,
                            long queriesBefore, boolean cacheEntryBefore) {
            this.enabled = true;
            this.year = year;
            this.startedAt = startedAt;
            this.statementsBefore = statementsBefore;
            this.queriesBefore = queriesBefore;
            this.cacheEntryBefore = cacheEntryBefore;
        }

        private Measurement() {
            enabled = false;
            year = 0;
            startedAt = 0;
            statementsBefore = 0;
            queriesBefore = 0;
            cacheEntryBefore = false;
        }

        private static Measurement disabled() {
            return new Measurement();
        }
    }
}
