package com.tesoreria.academic.core;

import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record Schedule(List<Day> days) {
    public enum BlockType { SUBJECT, BREAK, SNACK, LUNCH, ACTIVITY, EVENT }
    public record Block(int dayOfWeek, LocalTime startTime, LocalTime endTime,
                        BlockType type, String name, int order, String color) { }
    public record Day(int dayOfWeek, LocalTime entryTime, LocalTime exitTime, List<Block> blocks) { }

    public void validate() {
        require(days != null && days.size() <= 5, "Configure hasta cinco jornadas.");
        Set<Integer> configured = new HashSet<>();
        for (Day day : days) {
            require(day != null && day.dayOfWeek() >= 1 && day.dayOfWeek() <= 5,
                    "Solo se admiten días de lunes a viernes.");
            require(configured.add(day.dayOfWeek()), "La jornada está duplicada.");
            require(validTimes(day.entryTime(), day.exitTime()), "La entrada debe ser anterior a la salida.");
            require(day.blocks() != null && day.blocks().size() <= 100, "Bloques inválidos.");
            validateBlocks(day);
        }
    }

    private static void validateBlocks(Day day) {
        for (Block block : day.blocks()) {
            require(block != null && block.dayOfWeek() == day.dayOfWeek(), "Día del bloque inválido.");
            require(validTimes(block.startTime(), block.endTime()), "El inicio debe ser anterior al fin.");
            require(!block.startTime().isBefore(day.entryTime()) && !block.endTime().isAfter(day.exitTime()),
                    "El bloque queda fuera de la jornada.");
            require(block.type() != null && block.order() >= 0, "Tipo u orden inválido.");
            require(block.name() == null || block.name().length() <= 100, "El nombre admite hasta 100 caracteres.");
            require(block.type() != BlockType.SUBJECT && block.type() != BlockType.ACTIVITY && block.type() != BlockType.EVENT
                    || block.name() != null && !block.name().isBlank(), "Indique la materia, actividad o evento.");
            require(block.color() == null || block.color().matches("#[0-9a-fA-F]{6}"), "Color inválido.");
        }
        LocalTime previousEnd = null;
        for (Block block : day.blocks().stream().sorted(Comparator.comparing(Block::startTime)).toList()) {
            require(previousEnd == null || !block.startTime().isBefore(previousEnd),
                    "Hay bloques superpuestos en la jornada.");
            previousEnd = block.endTime();
        }
    }

    private static boolean validTimes(LocalTime start, LocalTime end) {
        return start != null && end != null && start.isBefore(end)
                && start.getSecond() == 0 && end.getSecond() == 0
                && start.getNano() == 0 && end.getNano() == 0;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new DomainException("schedule", HttpStatus.BAD_REQUEST, message);
    }
}
