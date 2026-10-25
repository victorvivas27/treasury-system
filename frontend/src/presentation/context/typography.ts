import { readStoredPreference, storePreference } from "./theme";

export const FONT_FAMILY_STORAGE_KEY = "app-font-family";

export type FontFamilyId = "default" | "jetbrains-mono" | "space-mono" | "ibm-plex-mono";

export const FONT_FAMILIES: Array<{ id: FontFamilyId; name: string }> = [
  { id: "default", name: "Actual" },
  { id: "jetbrains-mono", name: "JetBrains Mono — Developer" },
  { id: "space-mono", name: "Space Mono — Futurista" },
  { id: "ibm-plex-mono", name: "IBM Plex Mono — Técnico" },
];

export const isFontFamilyId = (value: string | null): value is FontFamilyId =>
  value === "default" || value === "jetbrains-mono" || value === "space-mono" || value === "ibm-plex-mono";

export const getStoredFontFamily = (): FontFamilyId => {
  const stored = readStoredPreference(FONT_FAMILY_STORAGE_KEY);
  if (stored === "inter" || stored === "roboto" || stored === "poppins") {
    storePreference(FONT_FAMILY_STORAGE_KEY, "default");
    return "default";
  }
  return isFontFamilyId(stored) ? stored : "default";
};

export const applyFontFamily = (fontFamily: FontFamilyId) => {
  document.documentElement.dataset.fontFamily = fontFamily;
};

export const storeFontFamily = (fontFamily: FontFamilyId) =>
  storePreference(FONT_FAMILY_STORAGE_KEY, fontFamily);
