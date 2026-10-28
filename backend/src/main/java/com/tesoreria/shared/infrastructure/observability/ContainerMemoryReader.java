package com.tesoreria.shared.infrastructure.observability;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Reads the memory counters exposed by cgroup v2 or v1. */
final class ContainerMemoryReader {
    static final long UNAVAILABLE = -1L;
    private static final String UNLIMITED = "max";

    private static final Path V2_USAGE = Path.of("/sys/fs/cgroup/memory.current");
    private static final Path V2_LIMIT = Path.of("/sys/fs/cgroup/memory.max");
    private static final Path V1_USAGE = Path.of("/sys/fs/cgroup/memory/memory.usage_in_bytes");
    private static final Path V1_LIMIT = Path.of("/sys/fs/cgroup/memory/memory.limit_in_bytes");

    private ContainerMemoryReader() { }

    static Reading read() {
        Reading v2 = readPair(V2_USAGE, V2_LIMIT);
        return v2.usageBytes() >= 0L && v2.limitBytes() >= 0L ? v2 : readPair(V1_USAGE, V1_LIMIT);
    }

    static Reading readPair(Path usagePath, Path limitPath) {
        return new Reading(readCounter(usagePath, false), readCounter(limitPath, true));
    }

    private static long readCounter(Path path, boolean limit) {
        try {
            String value = Files.readString(path).trim();
            if (value.isEmpty() || UNLIMITED.equalsIgnoreCase(value)) return UNAVAILABLE;
            long bytes = Long.parseLong(value);
            // cgroup v1 commonly reports a very large sentinel for an unlimited limit.
            if (bytes < 0L || (limit && bytes >= (1L << 60))) return UNAVAILABLE;
            return bytes;
        } catch (IOException | SecurityException | NumberFormatException ignored) {
            return UNAVAILABLE;
        }
    }

    record Reading(long usageBytes, long limitBytes) { }
}
