export function createNneoRisingFill(loader: HTMLElement, options?: { exitMs?: number; soundEnabled?: boolean; onExited?: () => void }): {
  markReady(): void;
  setProgress(value: number): void;
  stop(): void;
  finish(): void;
};
