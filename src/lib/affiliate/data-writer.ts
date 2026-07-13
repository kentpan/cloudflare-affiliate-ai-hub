// Unified data reader for .data/ directory.
//
// Architecture (elegant, no shims):
// - Node.js (local dev, GitHub Actions): uses node-data-writer.ts (fs)
// - Cloudflare Pages (edge): fetches .data/*.json from GitHub raw URL
// - The GitHub repo + branch is configured via NEXT_PUBLIC_GIT_REPO env var
//   (format: "owner/repo" or full URL "https://raw.githubusercontent.com/owner/repo/main")
//
// API routes use this module (edge-compatible fetch).
// Generator/scripts use node-data-writer.ts (fs, Node.js only).

// GitHub raw URL base — can be overridden by env var
const GITHUB_RAW_BASE = process.env.NEXT_PUBLIC_DATA_URL ||
  (process.env.NEXT_PUBLIC_GIT_REPO
    ? `https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_GIT_REPO}/main`
    : "");

// Local dev fallback: /data/ (static files from public/data/)
const LOCAL_DATA_BASE = "/data";

function isLocalDev(): boolean {
  // In local dev, there's no NEXT_PUBLIC_DATA_URL or NEXT_PUBLIC_GIT_REPO
  // and we're running on localhost
  if (typeof window !== "undefined") {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  }
  // Server-side: check if running locally
  return !GITHUB_RAW_BASE;
}

function getBaseUrl(): string {
  if (isLocalDev()) {
    // Local dev: use local server URL
    if (typeof window !== "undefined") {
      return window.location.origin + LOCAL_DATA_BASE;
    }
    return "http://localhost:3000" + LOCAL_DATA_BASE;
  }
  // Production (Cloudflare Pages): fetch from GitHub raw
  return GITHUB_RAW_BASE + "/.data";
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function readJson<T = unknown>(...segments: string[]): Promise<T | null> {
  const url = getBaseUrl() + "/" + segments.join("/");
  return fetchJson<T>(url);
}

/**
 * Returns today's date as YYYY-MM-DD in **UTC** (ISO 8601 calendar date).
 *
 * This MUST stay in sync with the GitHub Actions `daily-picker.yml` workflow,
 * which runs on the `0 0 * * *` UTC cron schedule and stamps data folders
 * with `date -u +%F` (also UTC). Using a local timezone here would cause a
 * mismatch: e.g. at UTC 23:00 on July 14 (= Beijing 07:00 on July 15) a
 * Shanghai-based "today" would probe `2026-07-15/summary.json` which doesn't
 * exist yet (the picker won't run until UTC 00:00 on July 15), and the
 * dashboard would silently fall back to yesterday's data.
 *
 * By computing "today" the same way the picker does (UTC), we guarantee the
 * probe targets the correct folder.
 */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

interface IndexShape {
  updatedAt?: string;
  dates?: string[];
  platforms?: string[];
  totals?: Record<string, unknown>;
}

// Tiny in-memory cache (5 min) for the index so we don't hammer GitHub
// on every API call. Edge runtime module scope lasts for the worker lifetime.
let cachedIndex: IndexShape | null = null;
let cachedIndexAt = 0;
const INDEX_TTL_MS = 5 * 60 * 1000;

async function fetchIndex(): Promise<IndexShape | null> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndexAt < INDEX_TTL_MS) {
    return cachedIndex;
  }
  const idx = await readJson<IndexShape>("index.json");
  if (idx) {
    cachedIndex = idx;
    cachedIndexAt = now;
  }
  return idx;
}

/**
 * List available dates (newest first).
 *
 * Auto-switch behaviour for "today's latest data":
 * 1. Read index.json from GitHub raw.
 * 2. Compute today's date in **UTC** (matching the picker's `date -u +%F`).
 * 3. If today is NOT in the index (index.json may lag behind the actual
 *    published files), probe `<today>/summary.json` directly. If it exists,
 *    prepend today to the returned list so the dashboard picks it up.
 */
export async function listDates(): Promise<string[]> {
  const idx = await fetchIndex();
  const dates = idx?.dates ?? [];

  // Dedup + preserve order
  const seen = new Set<string>();
  const out: string[] = [];
  const pushUnique = (d?: string) => {
    if (!d || seen.has(d)) return;
    seen.add(d);
    out.push(d);
  };

  // Auto-switch: ensure today's data is considered even if index.json is stale.
  // Uses UTC to match the GitHub Actions daily-picker cron schedule.
  const today = todayUTC();
  if (!dates.includes(today)) {
    const probe = await readJson<{ date?: string }>(today, "summary.json");
    if (probe) {
      pushUnique(today);
    }
  }

  for (const d of dates) pushUnique(d);
  return out;
}

/**
 * Resolve the latest available date — convenience wrapper used by API routes
 * that need a sane default when the client does not pass ?date=.
 */
export async function latestDate(): Promise<string | null> {
  const dates = await listDates();
  return dates[0] ?? null;
}

export function dataPath(...segments: string[]): string {
  return segments.join("/");
}
