const enabled = import.meta.env.VITE_LOGIN_INSTRUMENTATION === "true";
const START = "login:start";

export const loginPerformance = {
  start() {
    if (!enabled) return;
    performance.clearMarks();
    performance.clearMeasures();
    performance.mark(START);
  },
  mark(name: string) {
    if (enabled) performance.mark(`login:${name}`);
  },
  finish() {
    if (!enabled || !performance.getEntriesByName(START).length) return;
    performance.mark("login:dashboard-painted");
    const points = ["response", "navigation", "dashboard-api", "dashboard-painted"];
    const timings = Object.fromEntries(points.map((point) => {
      const mark = performance.getEntriesByName(`login:${point}`).at(-1);
      const start = performance.getEntriesByName(START).at(-1);
      return [point, Math.round((mark?.startTime ?? 0) - (start?.startTime ?? 0))];
    }));
    console.info("PERF login-to-dashboard ms", timings);
  },
};
