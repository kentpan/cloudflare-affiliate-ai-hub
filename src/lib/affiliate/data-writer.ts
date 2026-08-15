// Unified data reader for .data/ directory.
//
// Architecture (per user spec):
//   1. ALWAYS try local .data/ files first (via /data/[...path] route)
//   2. If local file is missing OR today's data is missing → fetch from GitHub API
//
// GitHub API endpoint:
//   GET https://api.github.com/repos/{owner}/{repo}/contents/.data/{path}
//   Headers:
//     Accept: application/vnd.github.raw+json  (returns raw file content, not base64)
//     User-Agent: affiliate-ai-hub             (required by GitHub API)
//     Authorization: Bearer {GITHUB_TOKEN}     (optional, for higher rate limit)
//
// GitHub repo is configured via:
//   NEXT_PUBLIC_GIT_REPO env var (format: "owner/repo")
//   OR NEXT_PUBLIC_DATA_URL env var (full URL "https://github.com/owner/repo")
//   OR fallback to DEFAULT_GIT_REPO constant.
//
// API routes use this module (edge-compatible fetch).
// Generator/scripts use node-data-writer.ts (fs, Node.js only).

const DEFAULT_GIT_REPO = "kentpan/cloudflare-affiliate-ai-hub";

/**
 * Resolve the GitHub repo in "owner/repo" format.
 * Priority: NEXT_PUBLIC_GIT_REPO > NEXT_PUBLIC_DATA_URL > DEFAULT_GIT_REPO.
 */
function getGitRepo(): string {
  if (process.env.NEXT_PUBLIC_GIT_REPO) {
    return process.env.NEXT_PUBLIC_GIT_REPO;
  }
  if (process.env.NEXT_PUBLIC_DATA_URL) {
    // Accept either https://github.com/owner/repo or https://raw.githubusercontent.com/owner/repo/main
    const m = process.env.NEXT_PUBLIC_DATA_URL.match(
      /github\.com\/([^/]+\/[^/]+)|raw\.githubusercontent\.com\/([^/]+\/[^/]+)/,
    );
    if (m) return (m[1] || m[2]).replace(/\.git$/, "");
  }
  return DEFAULT_GIT_REPO;
}

/**
 * Local base URL for fetching /data/[...path] (which reads from .data/ via fs).
 * - In dev: http://localhost:{PORT}
 * - In prod (CF Pages): only set if NEXT_PUBLIC_APP_URL is configured;
 *   otherwise return empty string (will skip local and go straight to GitHub).
 */
function getLocalBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }
  // In production, only attempt local if NEXT_PUBLIC_APP_URL is set
  // (CF Pages edge runtime cannot read local .data/ — /data/[...path] route
  // is nodejs runtime which isn't supported by next-on-pages).
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

/**
 * Build GitHub Contents API URL for a file path inside .data/.
 * Example: https://api.github.com/repos/owner/repo/contents/.data/index.json
 */
function getGithubApiUrl(...segments: string[]): string {
  const repo = getGitRepo();
  const filePath = `.data/${segments.join("/")}`;
  return `https://api.github.com/repos/${repo}/contents/${filePath}`;
}

/**
 * Fetch a JSON file from the local /data/[...path] route.
 * Returns null on any error (404, network, parse).
 */
async function fetchLocalJson<T>(...segments: string[]): Promise<T | null> {
  const base = getLocalBaseUrl();
  if (!base) return null;
  try {
    const url = `${base}/data/${segments.join("/")}`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch a JSON file from the GitHub Contents API.
 * Uses Accept: application/vnd.github.raw+json to get raw file content
 * (instead of base64-encoded JSON wrapper).
 * Optionally uses GITHUB_TOKEN for higher rate limits.
 */
async function fetchGithubJson<T>(...segments: string[]): Promise<T | null> {
  try {
    const url = getGithubApiUrl(...segments);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "affiliate-ai-hub",
    };
    // Optional: GITHUB_TOKEN for higher rate limits (60/hr unauth, 5000/hr auth)
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(
        `[data-writer] github api ${url} → HTTP ${res.status}`,
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(
      `[data-writer] github api failed:`,
      (e as Error).message,
    );
    return null;
  }
}

/**
 * Read a JSON file from .data/{segments}.
 *
 * Per spec:
 *   1. Try local .data/ first (via /data/[...path] route)
 *   2. If local returns null (file not found), fall back to GitHub API
 */
export async function readJson<T = unknown>(
  ...segments: string[]
): Promise<T | null> {
  // 1. Local first
  const local = await fetchLocalJson<T>(...segments);
  if (local !== null) return local;
  // 2. Fallback to GitHub Contents API
  return await fetchGithubJson<T>(...segments);
}

/**
 * Returns today's date as YYYY-MM-DD in **UTC** (ISO 8601 calendar date).
 *
 * This MUST stay in sync with the GitHub Actions `daily-picker.yml` workflow,
 * which runs on the `0 0 * * *` UTC cron schedule and stamps data folders
 * with `date -u +%F` (also UTC). Using a local timezone here would cause a
 * mismatch.
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

export { fetchIndex };

/**
 * List available dates (newest first).
 *
 * Per spec — "如果没有或者没有当天的数据再去github上获取":
 *   1. Read index.json (tries local first, then GitHub API).
 *   2. Compute today's date in UTC (matching picker's `date -u +%F`).
 *   3. If today is NOT in the index, probe `<today>/summary.json` directly.
 *      This will try local first, then GitHub API — so if local is missing
 *      today's data but GitHub has it, today gets prepended.
 *   4. In dev, also scan local .data/ directory for any date folders that
 *      may not yet be reflected in index.json.
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
  // readJson() tries local first, then GitHub API — so we automatically pick
  // up today's data from GitHub if it's not yet in local .data/.
  const today = todayUTC();
  if (!dates.includes(today)) {
    const probe = await readJson<{ date?: string }>(today, "summary.json");
    if (probe) {
      pushUnique(today);
    }
  }

  for (const d of dates) pushUnique(d);

  // Local dev: also scan local .data/ directory for any date folders.
  // This catches cases where local has more dates than index.json reports.
  if (process.env.NODE_ENV === "development") {
    try {
      const port = process.env.PORT || "3000";
      const res = await fetch(`http://localhost:${port}/api/data/dates`);
      if (res.ok) {
        const data = await res.json();
        for (const d of (data.dates ?? [])) pushUnique(d);
      }
    } catch {
      /* local API not available, use dates from index.json */
    }
  }

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
