export function createInitialCinematic(loader: HTMLElement, assets: { src: string; artwork: string; story: number }[]): {
  markReady(): void;
  stop(): void;
  finish(): void;
};
