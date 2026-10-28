package com.tesoreria.shared.infrastructure.observability;

import java.util.concurrent.atomic.AtomicInteger;

/** Emits each upward threshold crossing once until usage falls below that level. */
final class MemoryThresholdTracker {
    private final AtomicInteger reportedLevel = new AtomicInteger();

    int newlyCrossedThresholds(double percent) {
        int level = percent >= 90.0 ? 2 : percent >= 80.0 ? 1 : 0;
        int previous = reportedLevel.getAndSet(level);
        int crossed = 0;
        if (previous < 1 && level >= 1) crossed |= 1;
        if (previous < 2 && level >= 2) crossed |= 2;
        return crossed;
    }
}
