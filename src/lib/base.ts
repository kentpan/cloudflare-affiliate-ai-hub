// Base path helper for the affiliate-ai-hub dashboard.
//
// Because the dashboard is mounted under basePath "/affiliate" (see
// next.config.ts) and served behind the Caddyfile path-based route, every
// client-side fetch() / Link href that points at a project-relative URL must
// be prefixed with the basePath. <Link> and next/router do this automatically,
// but raw fetch() does not — so we centralise the prefix here.
//
// Usage:
//   import { withBase } from "@/lib/base";
//   fetch(withBase("/api/data/index"));
//   fetch(withBase(`/data/${date}/summary.json`));

export const BASE_PATH = "/affiliate";

export function withBase(path: string): string {
  if (!path) return BASE_PATH;
  if (path.startsWith(BASE_PATH)) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return BASE_PATH + (path.startsWith("/") ? path : "/" + path);
}
