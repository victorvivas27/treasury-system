import type { ReactNode, SVGProps } from 'react';
import type { AboutIcon } from '@/core/A-domain/entities/community/AboutSection';

type Symbol = AboutIcon | 'TREE';
type Props = SVGProps<SVGSVGElement> & { symbol: Symbol };

// Original drawings for the “Crecer juntos” community collection.
const drawings: Record<Symbol, ReactNode> = {
  TREE: <><path d="M24 41V21m0 11-9-8m9 3 10-9M16 42h16" /><path fill="currentColor" fillOpacity=".18" d="M24 23C14 20 17 8 24 5c7 4 9 14 0 18ZM16 29C7 29 4 22 5 16c9-1 16 5 11 13ZM31 22c-2-9 5-14 12-13 0 8-4 15-12 13Z" /><path d="M24 23C14 20 17 8 24 5c7 4 9 14 0 18ZM16 29C7 29 4 22 5 16c9-1 16 5 11 13ZM31 22c-2-9 5-14 12-13 0 8-4 15-12 13Z" /></>,
  USERS: <><circle cx="24" cy="10" r="4" /><circle cx="10" cy="23" r="4" /><circle cx="38" cy="23" r="4" /><path d="M17 21c0-8 14-8 14 0M4 36c0-9 12-9 12-1m16 0c0-8 12-8 12 1M15 40c5 4 13 4 18 0M24 35v-9" /><path fill="currentColor" fillOpacity=".2" d="M24 31c-6 0-8-4-8-7 6-1 8 3 8 7Zm0-3c0-6 4-8 8-8 1 5-3 8-8 8Z" /></>,
  HEART: <><path d="m5 27 9 1 8 7h8m-8 0-6-5m-11 7 9 5h18l11-12c-2-3-5-2-8 1l-5 4M5 27v10" /><path fill="currentColor" fillOpacity=".18" d="M24 25 14 15c-6-8 5-14 10-7 5-7 16-1 10 7Z" /><path d="M24 25 14 15c-6-8 5-14 10-7 5-7 16-1 10 7Z" /></>,
  STAR: <><path d="m24 6 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" /><path d="m19 23 4 4 7-8M7 37l-2 4m35-4 3 3" /></>,
  BOOK: <><path d="M24 40c-6-5-13-6-19-4V15c7-2 13 0 19 5 6-5 12-7 19-5v21c-6-2-13-1-19 4Zm0 0V20" /><path fill="currentColor" fillOpacity=".18" d="M24 16C16 15 15 9 16 5c6 0 10 4 8 11Z" /><path d="M24 16C16 15 15 9 16 5c6 0 10 4 8 11Zm0 4c0-7 5-11 10-12M10 23l8 3m-8 4 8 3m12-7 8-3m-8 10 8-3" /></>,
  TARGET: <><path d="M10 42c-1-10 23-10 20-19-2-5-11-1-10-8M30 6v17m0-17 12 3-12 5" /><circle cx="9" cy="40" r="3" /><path d="M5 19c3-5 7-7 12-7" /></>,
  SMILE: <><path d="M6 15c6-6 12-9 18-9s12 3 18 9M8 17v15c0 7 13 10 16 4 4 6 16 3 16-4V17M15 23h1m16 0h1m-18 6c2 3 6 3 8 0m3 0c2 3 6 3 8 0" /><path d="m20 12 4 4 4-4" /></>,
  AWARD: <><path d="M15 7h18v12c0 12-18 12-18 0ZM15 11H7v5c0 6 4 9 10 9m16-14h8v5c0 6-4 9-10 9M24 29v10m-9 3h18M18 39h12" /><path d="m20 17 3 3 6-6" /></>,
  COMPASS: <><path d="M8 38V10m0 0 11-4 10 4 11-4v28l-11 4-10-4-11 4m11-32v11m10 10v11M14 28c6-10 13 3 20-10" /><path d="m30 17 5 0-1 5" /></>,
  GIFT: <><path d="M7 42V16m34 26V16M7 19c10 7 24 7 34 0M9 21l4 11 7-6m8 0 7 6 4-11" /><path d="m24 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /></>,
  MUSIC: <><path d="M18 33V11l21-5v23M18 18l21-5" /><ellipse cx="12" cy="35" rx="6" ry="5" fill="currentColor" fillOpacity=".18" /><ellipse cx="33" cy="31" rx="6" ry="5" fill="currentColor" fillOpacity=".18" /><path d="M18 35c0 7-12 7-12 0s12-7 12 0Zm21-4c0 7-12 7-12 0s12-7 12 0ZM5 14l4 1m-1-7 3 3" /></>,
  SUN: <><path d="M5 35h38M12 35a12 12 0 0 1 24 0M24 6v6M7 16l4 4m30-4-4 4M5 27h4m30 0h4M24 43v-8" /><path fill="currentColor" fillOpacity=".18" d="M24 40c-7 0-10-5-10-8 7-1 10 3 10 8Zm0 0c0-7 5-10 10-9 0 6-4 9-10 9Z" /></>,
};

export function CommunityIcon({ symbol, ...props }: Props) {
  return <svg width="1em" height="1em" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" {...props}>{drawings[symbol] ?? drawings.USERS}</svg>;
}

export const communityIconLabels: Record<AboutIcon, string> = {
  USERS: 'Comunidad', HEART: 'Solidaridad', STAR: 'Aporte de cada familia', BOOK: 'Aprender juntos',
  TARGET: 'Metas compartidas', SMILE: 'Alegría compartida', AWARD: 'Logros del curso',
  COMPASS: 'Nuestro rumbo', GIFT: 'Celebración', MUSIC: 'Creatividad', SUN: 'Crecer juntos',
};
