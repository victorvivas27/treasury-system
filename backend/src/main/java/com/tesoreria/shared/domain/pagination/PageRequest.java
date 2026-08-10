package com.tesoreria.shared.domain.pagination;

public record PageRequest(
        int page,
        int size,
        String sortBy,
        String direction,
        String search) {

    public PageRequest(int page, int size, String sortBy, String direction) {
        this(page, size, sortBy, direction, null);
    }
}
