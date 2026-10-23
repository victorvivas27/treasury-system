import { DEFAULT_PALETTE, isPaletteId, PALETTE_STORAGE_KEY, type PaletteId } from "./palette";

export const THEME_STORAGE_KEY = "app-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "dark" || value === "light" || value === "system";

export const getStoredThemePreference = (): ThemePreference => {
  const storedTheme = readStoredPreference(THEME_STORAGE_KEY);
  return isThemePreference(storedTheme) ? storedTheme : "dark";
};

export const readStoredPreference = (key: string): string | null => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};

export const storePreference = (key: string, value: string) => {
  // Appearance remains usable when browser storage is unavailable.
  try { window.localStorage.setItem(key, value); } catch { /* Session-only preference. */ }
};

export const getStoredPalette = (): PaletteId => {
  const stored = readStoredPreference(PALETTE_STORAGE_KEY);
  return isPaletteId(stored) ? stored : DEFAULT_PALETTE;
};

export const syncThemeColor = () => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).backgroundColor);
};

export const applyPalette = (palette: PaletteId) => {
  document.documentElement.dataset.palette = palette;
  syncThemeColor();
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
  syncThemeColor();
};
