package com.tesoreria.shared.infrastructure.observability;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemoryObservabilityTest {
    @Test
    void summaryConvertsBytesAndKeepsUnavailableMetricsAndAlertsReadable() {
        String summary = MemoryObservability.readableSummary("runtime_periodic", Map.of(
                "heap_used_bytes", 1572864L,
                "heap_committed_bytes", 2097152L,
                "heap_max_bytes", -1L,
                "container_memory_percent", 85.25,
                "threshold_percent", 80));

        assertTrue(summary.contains("1.5 MiB usados"));
        assertTrue(summary.contains("2.0 MiB reservados"));
        assertTrue(summary.contains("N/D maximo"));
        assertTrue(summary.contains("Uso: 85.3%"));
        assertTrue(summary.contains("ALERTA: umbral 80%"));
        assertTrue(summary.contains("Hilos: N/D activos"));
    }

    @Test
    void reportsJvmHeapNonHeapPoolsThreadsAndGarbageCollectionCounters() {
        Map<String, Object> snapshot = new MemoryObservability().snapshot();

        assertTrue(value(snapshot, "heap_used_bytes") >= 0L);
        assertTrue(value(snapshot, "heap_committed_bytes") >= value(snapshot, "heap_used_bytes"));
        assertTrue(value(snapshot, "heap_max_bytes") > 0L);
        assertTrue(value(snapshot, "non_heap_used_bytes") >= 0L);
        assertTrue(snapshot.containsKey("metaspace_used_bytes"));
        assertTrue(snapshot.containsKey("code_cache_used_bytes"));
        assertTrue(value(snapshot, "threads_active") > 0L);
        assertTrue(value(snapshot, "gc_collection_count") >= 0L);
        assertTrue(value(snapshot, "gc_collection_time_ms") >= 0L);
        assertTrue(snapshot.containsKey("container_memory_used_bytes"));
        assertTrue(snapshot.containsKey("container_memory_limit_bytes"));
    }

    @Test
    void thresholdTrackerEmitsOnlyNewUpwardCrossingsAndResetsBelowEightyPercent() {
        MemoryThresholdTracker tracker = new MemoryThresholdTracker();

        assertEquals(0, tracker.newlyCrossedThresholds(79.99));
        assertEquals(1, tracker.newlyCrossedThresholds(80.0));
        assertEquals(0, tracker.newlyCrossedThresholds(85.0));
        assertEquals(2, tracker.newlyCrossedThresholds(90.0));
        assertEquals(0, tracker.newlyCrossedThresholds(95.0));
        assertEquals(0, tracker.newlyCrossedThresholds(79.0));
        assertEquals(3, tracker.newlyCrossedThresholds(95.0));
    }

    private long value(Map<String, Object> snapshot, String key) {
        return ((Number) snapshot.get(key)).longValue();
    }
}
