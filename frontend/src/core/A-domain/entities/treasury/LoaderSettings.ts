export type LoaderPreference = {
  variant: 'video' | 'cinematic' | 'video-light' | 'nneo-rising-fill';
  durationMs: number;
  exitMs: number;
  soundEnabled?: boolean;
};
export type LoaderConfiguration = { startup: LoaderPreference; pageTransition: LoaderPreference };
export type LoaderSection = 'startup' | 'pageTransition';
