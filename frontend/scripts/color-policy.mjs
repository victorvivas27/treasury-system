// Only independent resources may contain literal palette data outside theme.css.
export const independentColorSources = new Map([
  ['src/presentation/pages/academic/ScheduleColorPalette.tsx', 'User-selectable, persisted schedule colors; labels and values are a data contract.'],
  ['src/presentation/pages/academic/scheduleCards.ts', 'Independent schedule subject/type defaults; explicit block.color always wins.'],
  ['src/presentation/pages/stand/standSalesReport.css', 'Standalone A4 print document with a stable light scheme, independent of the screen theme.'],
]);

// A transparent comparison is not a configurable interface color.
export const nonVisualColorSources = new Map([
  ['src/presentation/pages/dashboard/captureElement.ts', ['rgba(0, 0, 0, 0)']],
]);

export const independentColorFragments = new Map([
  ['src/shared/ui/buttonback/ButtonBack.tsx', { fragment: 'fill="white"', reason: 'Exact first frame of the independent /icons/Back.json animation; keep the preview and asset consistent.' }],
]);

export const colorLiteralPattern = /#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lch|lab|hwb)\(\s*(?!from\b|var\()[\d.+-][^()]*\)|(?<![\w-])(?:white|black|red|blue|green|orange|gray|grey|yellow|purple|pink|teal|navy|silver|maroon|aqua|lime)(?![\w-])/gi;

export const baseNames = ['neutral-light','neutral-dark','primary','accent','success','warning','error','info'].map(name=>`--base-${name}`);
