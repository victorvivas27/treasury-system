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

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [themePreference, setPreference] = useState<ThemePreference>(getStoredThemePreference);
  const [palette, setPaletteState] = useState<PaletteId>(getStoredPalette);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia(SYSTEM_THEME_QUERY).matches,
  );
  const resolvedTheme = resolveTheme(themePreference, systemPrefersDark);

  useLayoutEffect(() => {
    applyPalette(palette);
    applyTheme(resolvedTheme);
  }, [resolvedTheme, palette]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === PALETTE_STORAGE_KEY || event.key === null)
        setPaletteState(isPaletteId(event.newValue) ? event.newValue : DEFAULT_PALETTE);
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

  const value = useMemo(
    () => ({ themePreference, resolvedTheme, setThemePreference, palette, setPalette }),
    [resolvedTheme, setThemePreference, themePreference, palette, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe utilizarse dentro de ThemeProvider");
  return context;
};
