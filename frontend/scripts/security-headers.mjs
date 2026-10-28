import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const imageManifest = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),
  "../src/shared/assets/publicImages.manifest.json"), "utf8"));
const publicArtworkSource = `${imageManifest.baseUrl}/`;

export const securityHeaders = (apiUrl = "http://localhost:5055/tesoreria/api/v1") => {
  const api = new URL(apiUrl);
  if (!["https:", "http:"].includes(api.protocol) || api.username || api.password) {
    throw new Error("VITE_API_URL must be an HTTP(S) URL without credentials");
  }
  const websocket = new URL(api.origin);
  websocket.protocol = api.protocol === "https:" ? "wss:" : "ws:";
  const origins = new Set([api.origin, websocket.origin]);
  // api.ts normalizes localhost to the browser's loopback hostname in development.
  if (["localhost", "127.0.0.1"].includes(api.hostname)) {
    for (const hostname of ["localhost", "127.0.0.1"]) {
      const http = new URL(api.origin);
      const ws = new URL(websocket.origin);
      http.hostname = hostname;
      ws.hostname = hostname;
      origins.add(http.origin);
      origins.add(ws.origin);
    }
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' blob:",
    `img-src 'self' data: blob: https://cdn.jsdelivr.net ${publicArtworkSource}`,
    `connect-src 'self' ${[...origins].join(" ")} blob: data:`,
    "font-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self' https://allure.invalid",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
  return [
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header Referrer-Policy "no-referrer" always;',
    'add_header X-Frame-Options "DENY" always;',
    'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;',
    // Enforce only proven compatible directives; the fuller policy is diagnostic.
    'add_header Content-Security-Policy "frame-ancestors \'none\'; object-src \'none\'" always;',
    `add_header Content-Security-Policy-Report-Only "${policy}" always;`,
    "",
  ].join("\n");
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { loadEnv } = await import("vite");
  const env = loadEnv("production", root, "VITE_");
  const output = resolve(root, "build/security-headers.conf");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, securityHeaders(process.env.VITE_API_URL || env.VITE_API_URL || undefined));
}
