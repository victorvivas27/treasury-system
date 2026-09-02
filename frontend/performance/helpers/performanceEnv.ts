import fs from "node:fs";
import path from "node:path";

const REQUIRED_KEYS = ["PERF_BASE_URL", "PERF_USERNAME", "PERF_PASSWORD"] as const;

export interface PerformanceEnv {
  baseUrl: string;
  username: string;
  password: string;
  iterations: number;
}

const unquote = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const loadDotEnv = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] == null) {
      process.env[key] = unquote(rawValue);
    }
  }
};

export const getPerformanceEnv = (): PerformanceEnv => {
  loadDotEnv();

  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required performance env keys: ${missing.join(", ")}`);
  }

  const iterations = Number(process.env.PERF_ITERATIONS ?? "5");

  return {
    baseUrl: process.env.PERF_BASE_URL as string,
    username: process.env.PERF_USERNAME as string,
    password: process.env.PERF_PASSWORD as string,
    iterations: Number.isInteger(iterations) && iterations > 0 ? iterations : 5,
  };
};
