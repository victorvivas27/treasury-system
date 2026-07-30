import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { THEME_STORAGE_KEY } from "./theme";

type ChangeListener = (event: MediaQueryListEvent) => void;

const createMatchMedia = (initialMatches: boolean) => {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  return {
    matchMedia,
    change(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
    listeners,
  };
};

const ThemeProbe = () => {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  return (
    <>
      <output>{`${themePreference}:${resolvedTheme}`}</output>
      <button onClick={() => setThemePreference("light")}>Claro</button>
      <button onClick={() => setThemePreference("dark")}>Oscuro</button>
      <button onClick={() => setThemePreference("system")}>Sistema</button>
    </>
  );
};

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "";
  });

  it("usa oscuro cuando no existe preferencia y ante un valor inválido", () => {
    const media = createMatchMedia(false);
    vi.stubGlobal("matchMedia", media.matchMedia);
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByText("dark:dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("cambia entre claro y oscuro y persiste la selección", async () => {
    vi.stubGlobal("matchMedia", createMatchMedia(false).matchMedia);
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "Claro" }));
    expect(screen.getByText("light:light")).toBeInTheDocument();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await user.click(screen.getByRole("button", { name: "Oscuro" }));
    expect(screen.getByText("dark:dark")).toBeInTheDocument();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("restaura la preferencia persistida al volver a montar", () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true).matchMedia);
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByText("light:light")).toBeInTheDocument();
  });

  it("resuelve Sistema y reacciona a sus cambios, eliminando el listener", async () => {
    const media = createMatchMedia(false);
    vi.stubGlobal("matchMedia", media.matchMedia);
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    const { unmount } = render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByText("system:light")).toBeInTheDocument();
    expect(media.listeners.size).toBe(1);

    act(() => media.change(true));
    expect(screen.getByText("system:dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
