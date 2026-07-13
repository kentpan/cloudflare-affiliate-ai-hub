// Filesystem-backed data writer for the .data directory.
// Mirrors the plan's layout: .data/index.json + .data/{date}/*.

import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function ensureDataRoot(): void {
  ensureDir(config.dataDir);
}

export function ensureDateDir(date: string): string {
  const dir = path.join(config.dataDir, date);
  fs.mkdirSync(path.join(dir, "dimensions"), { recursive: true });
  return dir;
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function readJson<T = unknown>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function listDates(): string[] {
  const root = config.dataDir;
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();
}

export function dataPath(...segments: string[]): string {
  return path.join(config.dataDir, ...segments);
}
