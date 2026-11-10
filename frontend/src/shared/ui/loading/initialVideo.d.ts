export function createInitialVideo(loader: HTMLElement, source: string, mobileSource: string, icons: string[]): {
  markReady(): void;
  stop(): void;
  finish(): void;
};
