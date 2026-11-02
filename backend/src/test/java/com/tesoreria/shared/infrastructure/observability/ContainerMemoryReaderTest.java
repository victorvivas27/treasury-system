package com.tesoreria.shared.infrastructure.observability;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ContainerMemoryReaderTest {
    @TempDir
    Path directory;

    @Test
    void readsCgroupUsageAndLimitAsBytes() throws IOException {
        Path usage = write("memory.current", "123456");
        Path limit = write("memory.max", "524288");

        ContainerMemoryReader.Reading result = ContainerMemoryReader.readPair(usage, limit);

        assertEquals(123456L, result.usageBytes());
        assertEquals(524288L, result.limitBytes());
    }

    @Test
    void treatsUnlimitedAndInvalidCountersAsUnavailable() throws IOException {
        Path usage = write("usage", "not-a-number");
        Path limit = write("limit", "max");

        ContainerMemoryReader.Reading result = ContainerMemoryReader.readPair(usage, limit);

        assertEquals(ContainerMemoryReader.UNAVAILABLE, result.usageBytes());
        assertEquals(ContainerMemoryReader.UNAVAILABLE, result.limitBytes());
    }

    @Test
    void treatsCgroupV1UnlimitedSentinelAsUnavailable() throws IOException {
        Path usage = write("memory.usage_in_bytes", "4096");
        Path limit = write("memory.limit_in_bytes", Long.toString(1L << 60));

        ContainerMemoryReader.Reading result = ContainerMemoryReader.readPair(usage, limit);

        assertEquals(4096L, result.usageBytes());
        assertEquals(ContainerMemoryReader.UNAVAILABLE, result.limitBytes());
    }

    private Path write(String name, String value) throws IOException {
        Path file = directory.resolve(name);
        return Files.writeString(file, value);
    }
}
