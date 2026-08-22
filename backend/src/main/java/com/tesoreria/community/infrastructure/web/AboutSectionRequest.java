package com.tesoreria.community.infrastructure.web;

import jakarta.validation.constraints.*;

public record AboutSectionRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String description,
        @NotNull @Min(0) Integer displayOrder,
        boolean visible,
        @NotBlank @Pattern(regexp = "USERS|HEART|STAR|BOOK|TARGET|SMILE|AWARD|COMPASS|GIFT|MUSIC|SUN")
        String icon,
        @NotBlank @Pattern(regexp = "TURQUOISE|BLUE|PURPLE|ORANGE|PINK|GREEN|RED|YELLOW|INDIGO|CORAL|SKY|LIME")
        String accentColor,
        @Size(max = 240) String highlightedPhrase,
        boolean featured) { }
