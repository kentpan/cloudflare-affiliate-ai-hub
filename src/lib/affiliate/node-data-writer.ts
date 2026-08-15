// Node.js-only sync data reader (used by scripts/generator, NOT by API routes).
// This file uses node:fs and process.cwd() which are NOT available in edge runtime.
// It must never be imported by API routes (which use edge runtime).
// Only imported by: generator.ts, customization.ts, comparison.ts, seed.ts

export function listDatesSync(): string[] {
  const fs = require("node:fs");
  const path = require("node:path");
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d: any) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d: any) => d.name)
    .sort()
    .reverse();
}

export function readJsonSync<T = unknown>(...segments: string[]): T | null {
  const fs = require("node:fs");
  const path = require("node:path");
  const filePath = path.join(getDataDir(), ...segments);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function writeJsonSync(filePath: string, data: unknown): void {
  const fs = require("node:fs");
  const path = require("node:path");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function ensureDataRootSync(): string {
  const fs = require("node:fs");
  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export function ensureDateDirSync(date: string): string {
  const fs = require("node:fs");
  const path = require("node:path");
  const dir = path.join(getDataDir(), date);
  fs.mkdirSync(path.join(dir, "dimensions"), { recursive: true });
  return dir;
}

// Resolve .data directory (no process.cwd at module level — only inside functions)
function getDataDir(): string {
  const path = require("node:path");
  return process.env.DATA_DIR || path.join(process.cwd(), ".data");
}
export function dataPath(...segments: string[]): string { const path = require("node:path"); return path.join(getDataDir(), ...segments); }
