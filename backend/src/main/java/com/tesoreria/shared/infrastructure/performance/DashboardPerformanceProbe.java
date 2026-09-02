package com.tesoreria.shared.infrastructure.performance;

import com.github.benmanes.caffeine.cache.Cache;
import com.tesoreria.shared.infrastructure.cache.CacheNames;
import jakarta.persistence.EntityManagerFactory;
import org.jspecify.annotations.Nullable;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.function.Supplier;

@Component
public class DashboardPerformanceProbe {
    private static final Logger LOG = LoggerFactory.getLogger(DashboardPerformanceProbe.class);
    private static final ThreadLocal<Measurement> CURRENT = new ThreadLocal<>();
    private final Statistics statistics;
    private final CacheManager cacheManager;
    private final DataSource dataSource;
    private final boolean enabled;

    public DashboardPerformanceProbe(EntityManagerFactory entityManagerFactory,
                                     CacheManager cacheManager,
                                     DataSource dataSource,
                                     @Value("${app.instrumentation.dashboard:false}") boolean enabled) {
        this.statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        this.cacheManager = cacheManager;
        this.dataSource = dataSource;
        this.enabled = enabled;
        if (enabled) statistics.setStatisticsEnabled(true);
    }

    public static long now() {
        return System.nanoTime();
    }

    private static long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    public Measurement start(int year) {
        return start("dashboard/overview", year);
    }

    public Measurement start(String endpoint, int year) {
        Measurement current = CURRENT.get();
        if (current != null) return current;
        if (!enabled) return Measurement.disabled();
        return new Measurement(year, System.nanoTime(), statistics.getPrepareStatementCount(),
                statistics.getQueryExecutionCount(), cacheContains(endpoint, year), endpoint, false);
    }

    public Measurement startRequest(String endpoint, int year) {
        if (!enabled) return Measurement.disabled();
        Measurement measurement = new Measurement(year, System.nanoTime(),
                statistics.getPrepareStatementCount(), statistics.getQueryExecutionCount(),
                cacheContains(endpoint, year), endpoint, true);
        CURRENT.set(measurement);
        return measurement;
    }

    public void measureConnectionAcquisition(Measurement measurement) {
        if (!measurement.enabled) return;
        long startedAt = now();
        try (Connection ignored = dataSource.getConnection()) {
            phase(measurement, "connectionAcquire.probe", startedAt);
        } catch (SQLException exception) {
            phase(measurement, "connectionAcquire.probeFailed", startedAt);
        }
    }

    public static void connectionAcquired(long startedAt) {
        Measurement measurement = CURRENT.get();
        if (measurement != null && measurement.enabled) {
            measurement.connectionAcquisitions.add(elapsedMillis(startedAt));
        }
    }

    public static void sql(String operation, String sql, long startedAt) {
        Measurement measurement = CURRENT.get();
        if (measurement != null && measurement.enabled) {
            measurement.sqlExecutions.add(new SqlExecution(operation, elapsedMillis(startedAt), sanitizeSql(sql)));
        }
    }

    private static String sanitizeSql(String sql) {
        if (sql == null || sql.isBlank()) return "<unknown>";
        String normalized = sql.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 240 ? normalized : normalized.substring(0, 237) + "...";
    }

    public <T> T repository(String name, Supplier<T> supplier) {
        Measurement measurement = CURRENT.get();
        if (measurement == null || !measurement.enabled) return supplier.get();
        long statementsBefore = statistics.getPrepareStatementCount();
        long queriesBefore = statistics.getQueryExecutionCount();
        long startedAt = now();
        T result = supplier.get();
        measurement.repositoryCalls.add(new RepositoryCall(name, elapsedMillis(startedAt),
                statistics.getPrepareStatementCount() - statementsBefore,
                statistics.getQueryExecutionCount() - queriesBefore, rowCount(result)));
        return result;
    }

    private long rowCount(@Nullable Object result) {
        if (result instanceof Collection<?> collection) return collection.size();
        if (result instanceof java.util.Optional<?> optional) return optional.isPresent() ? 1 : 0;
        return result == null ? 0 : 1;
    }

    public void phase(Measurement measurement, String name, long startedAt) {
        if (measurement.enabled) measurement.phases.put(name, elapsedMillis(startedAt));
    }

    public void phaseCurrent(String name, long startedAt) {
        Measurement measurement = CURRENT.get();
        if (measurement != null) phase(measurement, name, startedAt);
    }

    public void finish(Measurement measurement) {
        if (measurement.requestOwned) return;
        logAndClear(measurement);
    }

    public void finishRequest(Measurement measurement) {
        logAndClear(measurement);
    }

    private void logAndClear(Measurement measurement) {
        if (measurement.enabled && LOG.isInfoEnabled()) {
            LOG.info("PERF endpoint={} year={} totalMs={} phasesMs={} repositoryCalls={} sqlStatements={} hqlQueries={} cache={} cacheEntryAfter={}",
                    measurement.endpoint, measurement.year, elapsedMillis(measurement.startedAt),
                    measurement.phases, measurement.repositoryCalls,
                    statistics.getPrepareStatementCount() - measurement.statementsBefore,
                    statistics.getQueryExecutionCount() - measurement.queriesBefore,
                    measurement.cacheEntryBefore ? "HIT" : "MISS",
                    cacheContains(measurement.endpoint, measurement.year));
            if (!measurement.connectionAcquisitions.isEmpty() || !measurement.sqlExecutions.isEmpty()) {
                LOG.info("PERF_DETAIL endpoint={} year={} connectionAcquisitionsMs={} repeatedRepositoryCalls={} repeatedSqlFingerprints={} sqlExecutions={}",
                        measurement.endpoint, measurement.year, measurement.connectionAcquisitions,
                        repeatedRepositoryCalls(measurement.repositoryCalls),
                        repeatedSqlFingerprints(measurement.sqlExecutions), measurement.sqlExecutions);
            }
        }
        if (CURRENT.get() == measurement) CURRENT.remove();
    }

    private Map<String, Long> repeatedRepositoryCalls(List<RepositoryCall> calls) {
        Map<String, Long> counts = new LinkedHashMap<>();
        calls.forEach(call -> counts.merge(call.name(), 1L, Long::sum));
        counts.entrySet().removeIf(entry -> entry.getValue() < 2);
        return counts;
    }

    private Map<String, Long> repeatedSqlFingerprints(List<SqlExecution> executions) {
        Map<String, Long> counts = new LinkedHashMap<>();
        executions.forEach(execution -> counts.merge(sqlFingerprint(execution.sql()), 1L, Long::sum));
        counts.entrySet().removeIf(entry -> entry.getValue() < 2);
        return counts;
    }

    private String sqlFingerprint(String sql) {
        return sql.replaceAll("\\b\\d+\\b", "?")
                .replaceAll("'[^']*'", "?")
                .replaceAll("\\$\\d+", "?");
    }

    private boolean cacheContains(String endpoint, int year) {
        org.springframework.cache.Cache springCache = cacheManager.getCache(cacheName(endpoint));
        if (springCache == null) return false;
        Object nativeCache = springCache.getNativeCache();
        return nativeCache instanceof Cache<?, ?> caffeine && caffeine.asMap().containsKey(year);
    }

    private String cacheName(String endpoint) {
        return endpoint.endsWith("/aportes/resumen")
                ? CacheNames.CONTRIBUTION_SUMMARY
                : CacheNames.TREASURY_DASHBOARD_OVERVIEW;
    }

    public static final class Measurement {
        private final boolean enabled;
        private final int year;
        private final long startedAt;
        private final long statementsBefore;
        private final long queriesBefore;
        private final boolean cacheEntryBefore;
        private final String endpoint;
        private final boolean requestOwned;
        private final Map<String, Long> phases = new LinkedHashMap<>();
        private final List<RepositoryCall> repositoryCalls = new ArrayList<>();
        private final List<Long> connectionAcquisitions = new ArrayList<>();
        private final List<SqlExecution> sqlExecutions = new ArrayList<>();

        private Measurement(int year, long startedAt, long statementsBefore,
                            long queriesBefore, boolean cacheEntryBefore, String endpoint,
                            boolean requestOwned) {
            this.enabled = true;
            this.year = year;
            this.startedAt = startedAt;
            this.statementsBefore = statementsBefore;
            this.queriesBefore = queriesBefore;
            this.cacheEntryBefore = cacheEntryBefore;
            this.endpoint = endpoint;
            this.requestOwned = requestOwned;
        }

        private Measurement() {
            enabled = false;
            year = 0;
            startedAt = 0;
            statementsBefore = 0;
            queriesBefore = 0;
            cacheEntryBefore = false;
            endpoint = "";
            requestOwned = false;
        }

        private static Measurement disabled() {
            return new Measurement();
        }
    }

    private record RepositoryCall(String name, long ms, long sqlStatements,
                                  long hqlQueries, long rows) {
    }

    private record SqlExecution(String operation, long ms, String sql) {
    }
}
