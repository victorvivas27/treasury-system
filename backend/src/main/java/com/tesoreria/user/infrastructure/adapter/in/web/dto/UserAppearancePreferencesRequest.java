package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UserAppearancePreferencesRequest(
        @NotNull @Pattern(regexp = "dark|light|system") String themePreference,
        @NotNull @Pattern(regexp = "original|blue-lime|violet-coral|green-turquoise") String palette,
        @NotNull @Pattern(regexp = "default|jetbrains-mono|space-mono|ibm-plex-mono") String fontFamily) {
}
