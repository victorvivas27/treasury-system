package com.tesoreria.app.shared.domain.pagination;

public record PageRequest(
        int page,
        int size,
        String sortBy,
        String direction
) {
}
