import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyTheme,
  getStoredThemePreference,
  resolveTheme,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [themePreference, setPreference] = useState<ThemePreference>(getStoredThemePreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia(SYSTEM_THEME_QUERY).matches,
  );
  const resolvedTheme = resolveTheme(themePreference, systemPrefersDark);

  useEffect(() => {
    applyTheme(resolvedTheme);
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
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    setPreference(theme);
  }, []);

  const value = useMemo(
    () => ({ themePreference, resolvedTheme, setThemePreference }),
    [resolvedTheme, setThemePreference, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe utilizarse dentro de ThemeProvider");
  return context;
};
