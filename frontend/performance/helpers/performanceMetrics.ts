import fs from "node:fs/promises";
import path from "node:path";
import type { Page, Request, Response } from "@playwright/test";

export interface RequestMetric {
  screen: string;
  method: string;
  endpoint: string;
  status: number | "failed";
  durationMs: number;
  sizeBytes: number | null;
}

export interface NavigationMetric {
  iteration: number;
  screen: string;
  path: string;
  status: "ok" | "skipped";
  reason?: string;
  durationMs?: number;
  requestCount: number;
  transferBytes: number;
  endpoints: RequestMetric[];
}

export interface PerformanceReport {
  generatedAt: string;
  baseUrlOrigin: string;
  iterations: number;
  safeMode: string;
  navigation: NavigationMetric[];
  summary: ScreenSummary[];
  duplicateRequests: DuplicateRequest[];
  unsafeRequests: Array<{ screen: string; method: string; endpoint: string }>;
}

export interface ScreenSummary {
  screen: string;
  samples: number;
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  avgMs: number;
  maxMs: number;
  coldMs: number | null;
  warmAvgMs: number | null;
  requestAvg: number;
  transferAvgBytes: number;
}

export interface DuplicateRequest {
  screen: string;
  method: string;
  endpoint: string;
  count: number;
}

const pendingResponseReads: Array<Promise<void>> = [];

const percentile = (values: number[], ratio: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
};

const round = (value: number) => Math.round(value);

const sanitizeEndpoint = (url: string) => {
  const parsed = new URL(url);
  const queryKeys = [...parsed.searchParams.keys()].sort();
  return `${parsed.pathname}${queryKeys.length > 0 ? `?${queryKeys.join(",")}` : ""}`;
};

const looksLikeApiRequest = (url: string) => {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  return parsed.pathname.includes("/api/") || parsed.pathname.includes("/api-v") ||
    parsed.pathname.includes("/alumnos") || parsed.pathname.includes("/apoderados") ||
    parsed.pathname.includes("/tesoreria") || parsed.pathname.includes("/auth/");
};

const safeSize = async (response: Response) => {
  const header = response.headers()["content-length"];
  if (header && Number.isFinite(Number(header))) return Number(header);

  return null;
};

export const createMetricsCollector = (page: Page) => {
  const requestStarts = new Map<Request, {
    endpoint: string;
    method: string;
    screen: string;
    startedAt: number;
  }>();
  const records: RequestMetric[] = [];
  let activeScreen = "boot";

  page.on("request", (request) => {
    const url = request.url();
    if (!looksLikeApiRequest(url)) return;

    requestStarts.set(request, {
      endpoint: sanitizeEndpoint(url),
      method: request.method(),
      screen: activeScreen,
      startedAt: performance.now(),
    });
  });

  page.on("response", (response) => {
    const started = requestStarts.get(response.request());
    if (!started) return;

    const task = safeSize(response).then((sizeBytes) => {
      records.push({
        screen: started.screen,
        method: started.method,
        endpoint: started.endpoint,
        status: response.status(),
        durationMs: round(performance.now() - started.startedAt),
        sizeBytes,
      });
    }).finally(() => requestStarts.delete(response.request()));

    pendingResponseReads.push(task);
  });

  page.on("requestfailed", (request) => {
    const started = requestStarts.get(request);
    if (!started) return;

    records.push({
      screen: started.screen,
      method: started.method,
      endpoint: started.endpoint,
      status: "failed",
      durationMs: round(performance.now() - started.startedAt),
      sizeBytes: null,
    });
    requestStarts.delete(request);
  });

  return {
    setScreen(screen: string) {
      activeScreen = screen;
    },
    async take(screen: string) {
      await Promise.allSettled(pendingResponseReads.splice(0));
      const selected = records.filter((record) => record.screen === screen);
      for (const record of selected) {
        records.splice(records.indexOf(record), 1);
      }
      return selected;
    },
  };
};

const summarize = (navigation: NavigationMetric[]): ScreenSummary[] => {
  const screens = [...new Set(navigation.map((item) => item.screen))];

  return screens.map((screen) => {
    const samples = navigation
      .filter((item) => item.screen === screen && item.status === "ok" && item.durationMs != null);
    const durations = samples.map((item) => item.durationMs as number);
    const warmSamples = samples.slice(1);

    return {
      screen,
      samples: durations.length,
      p50Ms: round(percentile(durations, 0.5)),
      p95Ms: round(percentile(durations, 0.95)),
      minMs: durations.length ? round(Math.min(...durations)) : 0,
      avgMs: durations.length ? round(durations.reduce((sum, item) => sum + item, 0) / durations.length) : 0,
      maxMs: durations.length ? round(Math.max(...durations)) : 0,
      coldMs: durations[0] != null ? round(durations[0]) : null,
      warmAvgMs: warmSamples.length
        ? round(warmSamples.reduce((sum, item) => sum + (item.durationMs ?? 0), 0) / warmSamples.length)
        : null,
      requestAvg: samples.length
        ? round(samples.reduce((sum, item) => sum + item.requestCount, 0) / samples.length)
        : 0,
      transferAvgBytes: samples.length
        ? round(samples.reduce((sum, item) => sum + item.transferBytes, 0) / samples.length)
        : 0,
    };
  });
};

const findDuplicates = (navigation: NavigationMetric[]) => {
  const counts = new Map<string, DuplicateRequest>();

  for (const item of navigation) {
    const perScreen = new Map<string, DuplicateRequest>();
    for (const request of item.endpoints) {
      const key = `${item.screen}|${request.method}|${request.endpoint}`;
      const current = perScreen.get(key) ?? {
        screen: item.screen,
        method: request.method,
        endpoint: request.endpoint,
        count: 0,
      };
      current.count += 1;
      perScreen.set(key, current);
    }

    for (const duplicate of perScreen.values()) {
      if (duplicate.count <= 1) continue;
      const total = counts.get(`${duplicate.screen}|${duplicate.method}|${duplicate.endpoint}`) ?? {
        ...duplicate,
        count: 0,
      };
      total.count += duplicate.count;
      counts.set(`${duplicate.screen}|${duplicate.method}|${duplicate.endpoint}`, total);
    }
  }

  return [...counts.values()].sort((left, right) => right.count - left.count);
};

const findUnsafeRequests = (navigation: NavigationMetric[]) => {
  return navigation.flatMap((item) => item.endpoints
    .filter((request) => !["GET", "HEAD", "OPTIONS"].includes(request.method))
    .filter((request) => !(request.endpoint.endsWith("/auth/login") || request.endpoint.endsWith("/auth/refresh")))
    .map((request) => ({
      screen: item.screen,
      method: request.method,
      endpoint: request.endpoint,
    })));
};

const bytes = (value: number) => `${(value / 1024).toFixed(1)} KB`;

const toMarkdown = (report: PerformanceReport) => {
  const slowest = [...report.summary].sort((left, right) => right.p95Ms - left.p95Ms).slice(0, 10);
  const heaviest = [...report.summary]
    .sort((left, right) => right.transferAvgBytes - left.transferAvgBytes)
    .slice(0, 10);

  return [
    "# Performance Navigation Audit",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Origin: ${report.baseUrlOrigin}`,
    `- Iterations: ${report.iterations}`,
    `- Mode: ${report.safeMode}`,
    "",
    "## Navigation Summary",
    "",
    "| Screen | Samples | p50 | p95 | Min | Avg | Max | Cold | Warm avg | Avg requests | Avg transfer |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.summary.map((item) =>
      `| ${item.screen} | ${item.samples} | ${item.p50Ms} ms | ${item.p95Ms} ms | ` +
      `${item.minMs} ms | ${item.avgMs} ms | ${item.maxMs} ms | ` +
      `${item.coldMs ?? "n/a"} ms | ${item.warmAvgMs ?? "n/a"} ms | ` +
      `${item.requestAvg} | ${bytes(item.transferAvgBytes)} |`),
    "",
    "## Slowest Screens By P95",
    "",
    ...slowest.map((item, index) => `${index + 1}. ${item.screen}: ${item.p95Ms} ms p95`),
    "",
    "## Heaviest Screens By Transfer",
    "",
    ...heaviest.map((item, index) => `${index + 1}. ${item.screen}: ${bytes(item.transferAvgBytes)} avg`),
    "",
    "## Duplicate Requests",
    "",
    report.duplicateRequests.length
      ? "| Screen | Method | Endpoint | Count |\n| --- | --- | --- | ---: |\n" +
        report.duplicateRequests
          .map((item) => `| ${item.screen} | ${item.method} | \`${item.endpoint}\` | ${item.count} |`)
          .join("\n")
      : "No duplicate API requests detected inside a single screen sample.",
    "",
    "## Unsafe Request Check",
    "",
    report.unsafeRequests.length
      ? "| Screen | Method | Endpoint |\n| --- | --- | --- |\n" +
        report.unsafeRequests
          .map((item) => `| ${item.screen} | ${item.method} | \`${item.endpoint}\` |`)
          .join("\n")
      : "No non-read API calls detected after login navigation.",
    "",
    "## Endpoint Map",
    "",
    ...report.navigation.map((item) => [
      `### ${item.screen} - iteration ${item.iteration}`,
      "",
      item.status === "skipped"
        ? `Skipped: ${item.reason ?? "navigation link was not available."}`
        : item.endpoints.length
          ? "| Method | Endpoint | Status | Duration | Size |\n| --- | --- | ---: | ---: | ---: |\n" +
            item.endpoints
              .map((request) => `| ${request.method} | \`${request.endpoint}\` | ` +
                `${request.status} | ${request.durationMs} ms | ` +
                `${request.sizeBytes == null ? "n/a" : bytes(request.sizeBytes)} |`)
              .join("\n")
          : "No API requests captured for this screen.",
      "",
    ].join("\n")),
  ].join("\n");
};

export const writeReports = async (
  baseUrl: string,
  iterations: number,
  navigation: NavigationMetric[],
) => {
  const reportsDir = path.resolve(process.cwd(), "performance", "reports");
  await fs.mkdir(reportsDir, { recursive: true });

  const report: PerformanceReport = {
    generatedAt: new Date().toISOString(),
    baseUrlOrigin: new URL(baseUrl).origin,
    iterations,
    safeMode: "login + read-only navigation; no create/update/delete actions",
    navigation,
    summary: summarize(navigation),
    duplicateRequests: findDuplicates(navigation),
    unsafeRequests: findUnsafeRequests(navigation),
  };

  await fs.writeFile(
    path.join(reportsDir, "performance-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(path.join(reportsDir, "PERFORMANCE_REPORT.md"), toMarkdown(report), "utf8");

  return report;
};
