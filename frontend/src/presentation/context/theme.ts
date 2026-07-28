export const THEME_STORAGE_KEY = "app-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "dark" || value === "light" || value === "system";

export const getStoredThemePreference = (): ThemePreference => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedTheme) ? storedTheme : "dark";
};

export const resolveTheme = (
  preference: ThemePreference,
  systemPrefersDark = window.matchMedia(SYSTEM_THEME_QUERY).matches,
): ResolvedTheme => {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
};

export const applyTheme = (theme: ResolvedTheme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};
