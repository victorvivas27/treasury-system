import { defineConfig } from "vitest/config";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import config from "./vite.config.ts";

execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/prepare-bridge-frontend-fixture.cjs", import.meta.url))], { stdio: "inherit" });
export default defineConfig({ ...config, test: { ...config.test, include: ["security-tests/*.compat.tsx"] } });
