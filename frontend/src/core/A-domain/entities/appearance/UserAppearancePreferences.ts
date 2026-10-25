export type AppearanceThemePreference = "dark" | "light" | "system";
export type AppearancePaletteId = "original" | "blue-lime" | "violet-coral" | "green-turquoise";
export type AppearanceFontFamilyId = "default" | "jetbrains-mono" | "space-mono" | "ibm-plex-mono";

export interface UserAppearancePreferences {
  themePreference: AppearanceThemePreference | null;
  palette: AppearancePaletteId | null;
  fontFamily: AppearanceFontFamilyId | null;
}

export interface UserAppearancePreferencesPayload {
  themePreference: AppearanceThemePreference;
  palette: AppearancePaletteId;
  fontFamily: AppearanceFontFamilyId;
}
