package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ContributionConfig(Long id, int schoolYear, ContributionType type, String name,
    boolean active, BigDecimal referenceAmount, String observations,
    LocalDateTime createdAt, LocalDateTime updatedAt) { }
