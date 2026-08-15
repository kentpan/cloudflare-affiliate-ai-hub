// Base path helper for the affiliate-ai-hub dashboard.
//
// Reads NEXT_PUBLIC_BASE_PATH (same env var used by next.config.ts for
// conditional basePath). In production (CF Pages) this is unset → "".
// In sandbox dev, .env.local sets it to "/affiliate".
//
// Usage:
//   import { withBase } from "@/lib/base";
//   fetch(withBase("/api/data/index"));
//
// Production:  withBase("/api/data/index") → "/api/data/index"
// Sandbox dev: withBase("/api/data/index") → "/affiliate/api/data/index"

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBase(path: string): string {
  if (!path) return BASE_PATH || "/";
  if (BASE_PATH && path.startsWith(BASE_PATH)) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!BASE_PATH) return path; // production: no prefix
  return BASE_PATH + (path.startsWith("/") ? path : "/" + path);
}

