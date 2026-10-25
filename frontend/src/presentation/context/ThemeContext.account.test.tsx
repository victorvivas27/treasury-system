import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";
import type { UserAppearancePreferences } from "@/core/A-domain/entities/appearance/UserAppearancePreferences";

const { getPreferences, savePreferences, optionalAuth } = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  savePreferences: vi.fn(),
  optionalAuth: vi.fn(),
}));

vi.mock("./AuthContext", () => ({ useOptionalAuth: optionalAuth }));
vi.mock("@/core/C-infra/repositories/appearance/UserAppearancePreferencesRepository", () => ({
  getUserAppearancePreferences: getPreferences,
  saveUserAppearancePreferences: savePreferences,
}));

const Probe = () => {
  const { palette, fontFamily } = useTheme();
  return <output>{`${palette}:${fontFamily}`}</output>;
};

describe("appearance preferences per account", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    optionalAuth.mockReturnValue({ user: { id: 24 }, loading: false });
    savePreferences.mockResolvedValue(undefined);
  });

  it("applies preferences loaded from the signed-in account", async () => {
    getPreferences.mockResolvedValue({
      themePreference: "light", palette: "blue-lime", fontFamily: "ibm-plex-mono",
    } satisfies UserAppearancePreferences);

    render(<ThemeProvider><Probe /></ThemeProvider>);

    expect(await screen.findByText("blue-lime:ibm-plex-mono")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).toHaveAttribute("data-palette", "blue-lime");
    expect(document.documentElement).toHaveAttribute("data-font-family", "ibm-plex-mono");
    expect(localStorage.getItem("app-palette")).toBe("blue-lime");
    expect(localStorage.getItem("app-font-family")).toBe("ibm-plex-mono");
  });

  it("moves existing browser preferences into a new account", async () => {
    localStorage.setItem("app-palette", "violet-coral");
    localStorage.setItem("app-font-family", "space-mono");
    localStorage.setItem("app-theme", "system");
    getPreferences.mockResolvedValue({ themePreference: null, palette: null, fontFamily: null });

    render(<ThemeProvider><Probe /></ThemeProvider>);

    await waitFor(() => expect(savePreferences).toHaveBeenCalledWith({
      themePreference: "system", palette: "violet-coral", fontFamily: "space-mono",
    }));
    expect(screen.getByText("violet-coral:space-mono")).toBeInTheDocument();
  });
});
