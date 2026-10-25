import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  applyTheme,
  applyPalette,
  getStoredPalette,
  getStoredThemePreference,
  resolveTheme,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
  storePreference,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";
import { DEFAULT_PALETTE, isPaletteId, PALETTE_STORAGE_KEY, type PaletteId } from "./palette";
import {
  applyFontFamily,
  FONT_FAMILY_STORAGE_KEY,
  getStoredFontFamily,
  isFontFamilyId,
  storeFontFamily,
  type FontFamilyId,
} from "./typography";
import { useOptionalAuth } from "./AuthContext";
import {
  getUserAppearancePreferences,
  saveUserAppearancePreferences,
} from "@/core/C-infra/repositories/appearance/UserAppearancePreferencesRepository";

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
  fontFamily: FontFamilyId;
  setFontFamily: (fontFamily: FontFamilyId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const auth = useOptionalAuth();
  const [themePreference, setPreference] = useState<ThemePreference>(getStoredThemePreference);
  const [palette, setPaletteState] = useState<PaletteId>(getStoredPalette);
  const [fontFamily, setFontFamilyState] = useState<FontFamilyId>(getStoredFontFamily);
  const [preferencesReadyFor, setPreferencesReadyFor] = useState<number | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia(SYSTEM_THEME_QUERY).matches,
  );
  const resolvedTheme = resolveTheme(themePreference, systemPrefersDark);

  useLayoutEffect(() => {
    applyPalette(palette);
    applyFontFamily(fontFamily);
    applyTheme(resolvedTheme);
  }, [resolvedTheme, palette, fontFamily]);

  useEffect(() => {
    const userId = auth?.user?.id;
    if (!auth || auth.loading || !userId) {
      setPreferencesReadyFor(null);
      return;
    }

    let cancelled = false;
    setPreferencesReadyFor(null);
    getUserAppearancePreferences().then(async (stored) => {
      if (cancelled) return;
      if (stored.themePreference && isThemePreference(stored.themePreference)
        && stored.palette && isPaletteId(stored.palette)
        && stored.fontFamily && isFontFamilyId(stored.fontFamily)) {
        storePreference(THEME_STORAGE_KEY, stored.themePreference);
        storePreference(PALETTE_STORAGE_KEY, stored.palette);
        storeFontFamily(stored.fontFamily);
        setPreference(stored.themePreference);
        setPaletteState(stored.palette);
        setFontFamilyState(stored.fontFamily);
      } else {
        await saveUserAppearancePreferences({ themePreference, palette, fontFamily });
      }
      if (!cancelled) setPreferencesReadyFor(userId);
    }).catch(() => {
      if (!cancelled) setPreferencesReadyFor(userId);
    });

    return () => { cancelled = true; };
  }, [auth?.loading, auth?.user?.id]);

  useEffect(() => {
    if (!auth?.user?.id || preferencesReadyFor !== auth.user.id) return;
    void saveUserAppearancePreferences({ themePreference, palette, fontFamily }).catch(() => undefined);
  }, [auth?.user?.id, preferencesReadyFor, themePreference, palette, fontFamily]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === PALETTE_STORAGE_KEY || event.key === null)
        setPaletteState(isPaletteId(event.newValue) ? event.newValue : DEFAULT_PALETTE);
      if (event.key === FONT_FAMILY_STORAGE_KEY || event.key === null)
        setFontFamilyState(isFontFamilyId(event.newValue) ? event.newValue : "default");
      if (event.key === THEME_STORAGE_KEY || event.key === null)
        setPreference(isThemePreference(event.newValue) ? event.newValue : "dark");
    };
    const syncChrome = () => applyTheme(resolvedTheme);
    window.addEventListener("storage", sync);
    window.addEventListener("app:styles-ready", syncChrome);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("app:styles-ready", syncChrome);
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (themePreference !== "system") return;

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [themePreference]);

  const setThemePreference = useCallback((theme: ThemePreference) => {
    storePreference(THEME_STORAGE_KEY, theme);
    setPreference(theme);
  }, []);

  const setPalette = useCallback((value: PaletteId) => {
    storePreference(PALETTE_STORAGE_KEY, value);
    setPaletteState(value);
  }, []);

  const setFontFamily = useCallback((value: FontFamilyId) => {
    storeFontFamily(value);
    setFontFamilyState(value);
  }, []);

  const value = useMemo(
    () => ({ themePreference, resolvedTheme, setThemePreference, palette, setPalette, fontFamily, setFontFamily }),
    [resolvedTheme, setThemePreference, themePreference, palette, setPalette, fontFamily, setFontFamily],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe utilizarse dentro de ThemeProvider");
  return context;
};
