package com.tesoreria.shared.infrastructure.observability;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryPoolMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.ThreadMXBean;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class MemoryObservability {
    private static final Logger LOGGER = LoggerFactory.getLogger(MemoryObservability.class);
    private static final long UNAVAILABLE = -1L;
    private static final long ZERO = 0L;
    private static final int WARNING_MASK = 1;
    private static final int CRITICAL_MASK = 2;
    private static final int WARNING_PERCENT = 80;
    private static final int CRITICAL_PERCENT = 90;
    private static final String MEMORY_ROW_FORMAT = "  %-12s %12s usados | %12s reservados | %12s maximo%n";
    private final MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
    private final ThreadMXBean threads = ManagementFactory.getThreadMXBean();
    private final List<GarbageCollectorMXBean> collectors = ManagementFactory.getGarbageCollectorMXBeans();
    private final List<MemoryPoolMXBean> memoryPools = ManagementFactory.getMemoryPoolMXBeans();
    private final MemoryThresholdTracker thresholds = new MemoryThresholdTracker();
    private final AtomicBoolean applicationReady = new AtomicBoolean();

    @EventListener
    public void onContextRefreshed(ContextRefreshedEvent event) {
        observe("spring_context_refreshed");
        try {
            if (!event.getApplicationContext().getBeansOfType(jakarta.persistence.EntityManagerFactory.class)
                    .isEmpty()) {
                observe("hibernate_entity_manager_factory_ready");
            }
        } catch (RuntimeException ignored) {
            // A diagnostic must not interfere with Spring context refresh.
        }
    }

    @EventListener
    public void onApplicationStarted(ApplicationStartedEvent event) {
        observe("spring_application_started");
    }

    @EventListener
    public void onApplicationReady(ApplicationReadyEvent event) {
        applicationReady.set(true);
        observe("application_ready");
    }

    @Scheduled(fixedDelayString = "${app.observability.memory.sample-interval-ms:60000}")
    public void sampleDuringRuntime() {
        if (applicationReady.get()) observe("runtime_periodic");
    }

    public void observe(String stage) {
        try {
            Map<String, Object> values = snapshot();
            log("memory_observation", stage, values, LOGGER.atInfo());

            long used = number(values.get("container_memory_used_bytes"));
            long limit = number(values.get("container_memory_limit_bytes"));
            if (used >= ZERO && limit > ZERO) {
                int crossed = thresholds.newlyCrossedThresholds(100.0 * used / limit);
                if ((crossed & WARNING_MASK) != 0) {
                    log("memory_threshold_exceeded", stage, withThreshold(values, WARNING_PERCENT),
                            LOGGER.atWarn());
                }
                if ((crossed & CRITICAL_MASK) != 0) {
                    log("memory_threshold_exceeded", stage, withThreshold(values, CRITICAL_PERCENT),
                            LOGGER.atWarn());
                }
            }
        } catch (RuntimeException ignored) {
            // Missing or unsupported metrics must never fail startup or a request.
        }
    }

    Map<String, Object> snapshot() {
        Map<String, Object> values = new LinkedHashMap<>();
        addUsage(values, "heap", safeUsage(true));
        addUsage(values, "non_heap", safeUsage(false));

        PoolUsage metaspace = poolUsage("metaspace");
        addPool(values, "metaspace", metaspace.used(), metaspace.committed(), metaspace.maximum());
        PoolUsage codeCache = poolUsage("code cache");
        addPool(values, "code_cache", codeCache.used(), codeCache.committed(), codeCache.maximum());

        values.put("threads_active", safe(threads::getThreadCount));
        values.put("threads_daemon", safe(threads::getDaemonThreadCount));
        values.put("threads_peak", safe(threads::getPeakThreadCount));

        long gcCount = ZERO;
        long gcTime = ZERO;
        boolean hasGcCount = false;
        boolean hasGcTime = false;
        for (GarbageCollectorMXBean collector : collectors) {
            try {
                long count = collector.getCollectionCount();
                long time = collector.getCollectionTime();
                if (count >= ZERO) { gcCount += count; hasGcCount = true; }
                if (time >= ZERO) { gcTime += time; hasGcTime = true; }
            } catch (RuntimeException ignored) {
                // A collector may not expose counters on every JVM implementation.
            }
        }
        values.put("gc_collection_count", hasGcCount ? gcCount : UNAVAILABLE);
        values.put("gc_collection_time_ms", hasGcTime ? gcTime : UNAVAILABLE);

        ContainerMemoryReader.Reading container = ContainerMemoryReader.read();
        values.put("container_memory_used_bytes", container.usageBytes());
        values.put("container_memory_limit_bytes", container.limitBytes());
        values.put("container_memory_percent", container.usageBytes() >= ZERO && container.limitBytes() > ZERO
                ? Math.round(10000.0 * container.usageBytes() / container.limitBytes()) / 100.0
                : (double) UNAVAILABLE);
        return values;
    }

    private PoolUsage poolUsage(String match) {
        long used = ZERO;
        long committed = ZERO;
        long maximum = ZERO;
        boolean found = false;
        boolean hasMax = true;
        for (MemoryPoolMXBean pool : memoryPools) {
            if (!pool.getName().toLowerCase(Locale.ROOT).contains(match)) continue;
            try {
                MemoryUsage usage = pool.getUsage();
                if (usage == null) continue;
                found = true;
                used += Math.max(0L, usage.getUsed());
                committed += Math.max(0L, usage.getCommitted());
                if (usage.getMax() == UNAVAILABLE) hasMax = false;
                else maximum += usage.getMax();
            } catch (RuntimeException ignored) {
                // Ignore unsupported pools and retain the values from available pools.
            }
        }
        return found ? new PoolUsage(used, committed, hasMax ? maximum : UNAVAILABLE)
                : new PoolUsage(UNAVAILABLE, UNAVAILABLE, UNAVAILABLE);
    }

    private static void addUsage(Map<String, Object> values, String prefix, MemoryUsage usage) {
        values.put(prefix + "_used_bytes", usage == null ? -1L : usage.getUsed());
        values.put(prefix + "_committed_bytes", usage == null ? -1L : usage.getCommitted());
        values.put(prefix + "_max_bytes", usage == null ? -1L : usage.getMax());
    }

    private static void addPool(Map<String, Object> values, String prefix,
                                long used, long committed, long maximum) {
        values.put(prefix + "_used_bytes", used);
        values.put(prefix + "_committed_bytes", committed);
        values.put(prefix + "_max_bytes", maximum);
    }

    private static Map<String, Object> withThreshold(Map<String, Object> values, int threshold) {
        Map<String, Object> alert = new LinkedHashMap<>(values);
        alert.put("threshold_percent", threshold);
        return alert;
    }

    private static long number(Object value) {
        return value instanceof Number number ? number.longValue() : -1L;
    }

    private MemoryUsage safeUsage(boolean heap) {
        try { return heap ? memory.getHeapMemoryUsage() : memory.getNonHeapMemoryUsage(); }
        catch (RuntimeException ignored) { return null; }
    }

    private static long safe(LongSupplier supplier) {
        try { return supplier.get(); }
        catch (RuntimeException ignored) { return -1L; }
    }

    private static void log(String event, String stage, Map<String, Object> values,
                            LoggingEventBuilder builder) {
        builder.addKeyValue("event", event).addKeyValue("stage", stage);
        values.forEach(builder::addKeyValue);
        builder.setMessage(() -> readableSummary(stage, values)).log();
    }

    static String readableSummary(String stage, Map<String, Object> values) {
        String alert = values.containsKey("threshold_percent")
                ? " | ALERTA: umbral " + values.get("threshold_percent") + "%" : "";
        return String.format(Locale.ROOT,
                "Memoria [%s]%s%n"
                        + MEMORY_ROW_FORMAT.repeat(4)
                        + "  Contenedor: %s / %s | Uso: %s%n"
                        + "  Hilos: %s activos | %s daemon | %s pico | GC: %s ciclos, %s ms",
                stage, alert,
                "Heap", mib(values, "heap_used_bytes"), mib(values, "heap_committed_bytes"), mib(values, "heap_max_bytes"),
                "No heap", mib(values, "non_heap_used_bytes"), mib(values, "non_heap_committed_bytes"), mib(values, "non_heap_max_bytes"),
                "Metaspace", mib(values, "metaspace_used_bytes"), mib(values, "metaspace_committed_bytes"), mib(values, "metaspace_max_bytes"),
                "Code cache", mib(values, "code_cache_used_bytes"), mib(values, "code_cache_committed_bytes"), mib(values, "code_cache_max_bytes"),
                mib(values, "container_memory_used_bytes"), mib(values, "container_memory_limit_bytes"), percent(values),
                counter(values, "threads_active"), counter(values, "threads_daemon"), counter(values, "threads_peak"),
                counter(values, "gc_collection_count"), counter(values, "gc_collection_time_ms"));
    }

    private static String mib(Map<String, Object> values, String key) {
        long bytes = number(values.get(key));
        return bytes < ZERO ? "N/D" : String.format(Locale.ROOT, "%.1f MiB", bytes / 1048576.0);
    }

    private static String counter(Map<String, Object> values, String key) {
        long value = number(values.get(key));
        return value < ZERO ? "N/D" : Long.toString(value);
    }

    private static String percent(Map<String, Object> values) {
        Object value = values.get("container_memory_percent");
        return value instanceof Number numeric && numeric.doubleValue() >= ZERO
                ? String.format(Locale.ROOT, "%.1f%%", numeric.doubleValue()) : "N/D";
    }

    @FunctionalInterface
    private interface LongSupplier { long get(); }

    private record PoolUsage(long used, long committed, long maximum) { }
}
