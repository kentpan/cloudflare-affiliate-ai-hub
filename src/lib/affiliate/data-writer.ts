// Unified data reader for .data/ directory.
//
// Architecture:
//   1. Try local /data/[...path] route (edge route that proxies to GitHub API
//      with 5-min in-memory cache)
//   2. If that fails, fetch directly from GitHub Contents API
//
// Both paths ultimately read from GitHub, but the /data/[...path] route
// provides an additional layer of caching to reduce GitHub API calls.
//
// GitHub API endpoint:
//   GET https://api.github.com/repos/{owner}/{repo}/contents/.data/{path}
//   Headers:
//     Accept: application/vnd.github.raw+json  (returns raw file content)
//     User-Agent: affiliate-ai-hub             (required by GitHub API)
//     Authorization: Bearer {GITHUB_TOKEN}     (optional, for higher rate limit)
//
// GitHub repo is configured via:
//   NEXT_PUBLIC_GIT_REPO env var (format: "owner/repo")
//   OR NEXT_PUBLIC_DATA_URL env var (full URL "https://github.com/owner/repo")
//   OR fallback to DEFAULT_GIT_REPO constant.

const DEFAULT_GIT_REPO = "kentpan/cloudflare-affiliate-ai-hub";

/**
 * Resolve the GitHub repo in "owner/repo" format.
 */
function getGitRepo(): string {
  if (process.env.NEXT_PUBLIC_GIT_REPO) {
    return process.env.NEXT_PUBLIC_GIT_REPO;
  }
  if (process.env.NEXT_PUBLIC_DATA_URL) {
    const m = process.env.NEXT_PUBLIC_DATA_URL.match(
      /github\.com\/([^/]+\/[^/]+)|raw\.githubusercontent\.com\/([^/]+\/[^/]+)/,
    );
    if (m) return (m[1] || m[2]).replace(/\.git$/, "");
  }
  return DEFAULT_GIT_REPO;
}

/**
 * Get the base URL for fetching /data/[...path] (the edge route that
 * proxies to GitHub API with caching).
 *
 * - In dev: http://localhost:{PORT}
 * - In prod (CF Pages): relative URL won't work in server-side fetch, so
 *   return empty string — callers will fetch directly from GitHub API.
 */
function getLocalBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }
  // In production, we can't construct an absolute URL without knowing the
  // deployment domain. Return empty — caller will use GitHub API directly.
  return "";
}

/**
 * Build GitHub Contents API URL for a file path inside .data/.
 */
function getGithubApiUrl(...segments: string[]): string {
  const repo = getGitRepo();
  const filePath = `.data/${segments.join("/")}`;
  return `https://api.github.com/repos/${repo}/contents/${filePath}`;
}

// ─── Per-file in-memory cache ──────────────────────────────────────────────
// Reduces GitHub API calls. Edge runtime module scope persists for worker lifetime.
interface CacheEntry<T> {
  data: T | null;
  expiresAt: number;
}
const fileCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a JSON file from the local /data/[...path] route (edge route with cache).
 * Returns null on any error.
 */
async function fetchLocalJson<T>(...segments: string[]): Promise<T | null> {
  const base = getLocalBaseUrl();
  if (!base) return null;
  try {
    const url = `${base}/data/${segments.join("/")}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch a JSON file directly from the GitHub Contents API.
 */
async function fetchGithubJson<T>(...segments: string[]): Promise<T | null> {
  try {
    const url = getGithubApiUrl(...segments);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "affiliate-ai-hub",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[data-writer] github api ${url} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[data-writer] github api failed:`, (e as Error).message);
    return null;
  }
}

/**
 * Read a JSON file from .data/{segments}.
 *
 * Per spec — "先获取本地.data/下的文件, 如果没有或者没有当天的数据再去github上获取":
 *   1. Try local /data/[...path] route first (which reads from GitHub API
 *      with caching — this is the "local" data path)
 *   2. If local route fails, fetch directly from GitHub API
 *   3. Results are cached per-file for 5 minutes to reduce API calls
 */
export async function readJson<T = unknown>(
  ...segments: string[]
): Promise<T | null> {
  const cacheKey = segments.join("/");

  // Check cache first
  const cached = fileCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 1. Try local route (cached proxy to GitHub API)
  let result = await fetchLocalJson<T>(...segments);

  // 2. Fallback: fetch directly from GitHub API
  if (result === null) {
    result = await fetchGithubJson<T>(...segments);
  }

  // Cache the result (including null — prevents repeated failed lookups)
  fileCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

/**
 * Returns today's date as YYYY-MM-DD in **UTC** (ISO 8601 calendar date).
 * Matches the GitHub Actions daily-picker cron schedule (UTC).
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

// Index-specific cache (separate from file cache for the fetchIndex wrapper)
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

export { fetchIndex };

/**
 * List available dates (newest first).
 *
 * Per spec — "如果没有或者没有当天的数据再去github上获取":
 *   1. Read index.json (via readJson → cached GitHub API)
 *   2. Compute today's date in UTC
 *   3. If today is NOT in the index, probe `<today>/summary.json` directly
 *   4. In dev, also try local /api/data/dates for any additional local dates
 */
export async function listDates(): Promise<string[]> {
  const idx = await fetchIndex();
  const dates = idx?.dates ?? [];

  const seen = new Set<string>();
  const out: string[] = [];
  const pushUnique = (d?: string) => {
    if (!d || seen.has(d)) return;
    seen.add(d);
    out.push(d);
  };

  // Auto-switch: ensure today's data is considered even if index.json is stale.
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
 * Resolve the latest available date.
 */
export async function latestDate(): Promise<string | null> {
  const dates = await listDates();
  return dates[0] ?? null;
}

export function dataPath(...segments: string[]): string {
  return segments.join("/");
}
