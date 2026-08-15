// Unified data reader for .data/ directory.
//
// Architecture:
//   All environments (dev + prod) fetch from GitHub Contents API with a
//   5-minute in-memory cache. Edge runtime cannot use node:fs, so local
//   .data/ files are not directly readable from the web layer.
//
//   The /data/[...path] route (also edge) serves as a cached proxy to the
//   same GitHub API, providing an additional cache layer for browser requests.
//
//   本地 .data/ 文件只给 scripts/ (generator 等) 使用,不通过 web 访问。
//
// GitHub API endpoint:
//   GET https://api.github.com/repos/{owner}/{repo}/contents/.data/{path}
//   Headers:
//     Accept: application/vnd.github.raw+json  (returns raw file content)
//     User-Agent: affiliate-ai-hub             (required by GitHub API)
//     Authorization: Bearer {GITHUB_TOKEN}     (optional, for higher rate limit)

const DEFAULT_GIT_REPO = "kentpan/cloudflare-affiliate-ai-hub";

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

function getGithubApiUrl(...segments: string[]): string {
  const repo = getGitRepo();
  const filePath = `.data/${segments.join("/")}`;
  return `https://api.github.com/repos/${repo}/contents/${filePath}`;
}

// ─── Per-file in-memory cache ──────────────────────────────────────────────
interface CacheEntry<T> {
  data: T | null;
  expiresAt: number;
}
const fileCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a JSON file from the /data/[...path] route (cached GitHub API proxy).
 * Returns null on any error.
 */
async function fetchViaDataRoute<T>(...segments: string[]): Promise<T | null> {
  try {
    // 相对 URL,在 edge runtime 中可用 (同源请求)
    const url = `/data/${segments.join("/")}`;
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
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Read a JSON file from .data/{segments}.
 *
 * 数据获取优先级:
 *   1. 内存缓存 (5 分钟 TTL)
 *   2. /data/[...path] 路由 (带缓存的 GitHub API 代理)
 *   3. 直接 fetch GitHub Contents API (fallback)
 *
 * "先获取本地.data/下的文件, 如果没有或者没有当天的数据再去github上获取"
 *   - /data/[...path] 路由有内存缓存,命中缓存时不会请求 GitHub
 *   - 缓存未命中时从 GitHub API 获取最新数据
 */
export async function readJson<T = unknown>(
  ...segments: string[]
): Promise<T | null> {
  const cacheKey = segments.join("/");

  // 1. 检查内存缓存
  const cached = fileCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 2. 通过 /data/[...path] 路由获取 (有一层路由级缓存)
  let result = await fetchViaDataRoute<T>(...segments);

  // 3. Fallback: 直接 fetch GitHub API
  if (result === null) {
    result = await fetchGithubJson<T>(...segments);
  }

  // 缓存结果 (包括 null,避免重复失败请求)
  fileCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

/**
 * Returns today's date as YYYY-MM-DD in UTC (matches daily-picker cron schedule).
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

// Index-specific cache
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
 * "如果没有或者没有当天的数据再去github上获取":
 *   1. Read index.json (via readJson → 缓存 GitHub API)
 *   2. Compute today's date in UTC
 *   3. If today is NOT in the index, probe `<today>/summary.json` directly
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
