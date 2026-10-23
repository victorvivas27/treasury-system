export const PALETTE_STORAGE_KEY = "app-palette";
export const DEFAULT_PALETTE = "original";

export const PALETTES = [
  { id: "original", name: "Original", description: "La identidad de siempre." },
  { id: "blue-lime", name: "Azul y lima", description: "Moderna y energética." },
  { id: "violet-coral", name: "Violeta y coral", description: "Creativa y cálida." },
  { id: "green-turquoise", name: "Verde esmeralda y dorado", description: "Natural y equilibrada." },
] as const;

export type PaletteId = typeof PALETTES[number]["id"];

export const isPaletteId = (value: string | null): value is PaletteId =>
  PALETTES.some(palette => palette.id === value);
