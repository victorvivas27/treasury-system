import { useSyncExternalStore } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

let pendingPrompt: InstallPrompt | null = null;
const displayMode = window.matchMedia("(display-mode: standalone)");
const isStandalone = () => displayMode.matches || Boolean(
  (navigator as Navigator & { standalone?: boolean }).standalone,
);
let installed = isStandalone();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Capture the event before the home page mounts, including after login.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pendingPrompt = event as InstallPrompt;
  notify();
});
window.addEventListener("appinstalled", () => {
  installed = true;
  pendingPrompt = null;
  notify();
});
displayMode.addEventListener("change", () => {
  installed = isStandalone();
  notify();
});

export const useAppInstallation = () => {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => installed ? "installed" : pendingPrompt ? "ready" : "manual",
  );
  return {
    state,
    install: async () => {
      const prompt = pendingPrompt;
      if (!prompt) return "manual";
      pendingPrompt = null;
      notify();
      try {
        return (await prompt.prompt()).outcome;
      } catch {
        return "manual";
      }
    },
  };
};
