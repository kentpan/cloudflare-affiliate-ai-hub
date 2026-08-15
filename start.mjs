#!/usr/bin/env node
/**
 * Next.js startup wrapper that loads .env BEFORE the Next.js CLI parses
 * the -p (port) flag.
 *
 * Why this exists:
 *   Next.js automatically loads .env files, but only AFTER its CLI has
 *   already parsed the `-p PORT` argument. So `next dev -p $PORT` cannot
 *   read PORT from .env directly. This script:
 *     1. Parses .env manually (only sets vars not already in process.env)
 *     2. Reads PORT (default 3000)
 *     3. Spawns `next <dev|start> -p <PORT>` with the env loaded
 *
 * Used by package.json scripts:
 *   "dev":   "node start.mjs dev"
 *   "start": "node start.mjs start"
 *
 * The PORT in .env is also picked up by next.config.ts (Next.js loads .env
 * before evaluating next.config.ts), so config code can read process.env.PORT.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname);
const ENV_FILE = resolve(PROJECT_DIR, ".env");

/**
 * Manually parse .env file and populate process.env.
 * Existing process.env values take precedence (do not override).
 */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Match KEY=VALUE (VALUE may contain = signs)
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load .env then .env.local (if exists) — .env.local takes precedence
loadEnvFile(ENV_FILE);
loadEnvFile(resolve(PROJECT_DIR, ".env.local"));

const PORT = process.env.PORT || "3000";
const command = process.argv[2] || "dev"; // "dev" | "start" | "build"

if (command === "build") {
  // Build doesn't need a port — just delegate to next build
  const child = spawn("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    cwd: PROJECT_DIR,
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  console.log(`[start.mjs] PORT=${PORT} (from .env or default)`);
  console.log(`[start.mjs] Starting: next ${command} -p ${PORT}`);
  const child = spawn("npx", ["next", command, "-p", String(PORT)], {
    stdio: "inherit",
    shell: true,
    cwd: PROJECT_DIR,
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}
