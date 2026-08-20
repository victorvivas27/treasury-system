package com.tesoreria.community.core.model;

import java.time.LocalDateTime;

public record AboutSection(Long id, String title, String description, Integer displayOrder,
        boolean visible, String icon, String accentColor, String highlightedPhrase,
        boolean featured, LocalDateTime createdAt, LocalDateTime updatedAt) { }
