// GET /data/[...path] — 带缓存的 GitHub Contents API 代理。
//
// Edge runtime (兼容 @cloudflare/next-on-pages 构建,无需在 CI 中删除此文件)。
//
// 设计说明:
//   Edge runtime 不能使用 node:fs,因此无法直接读取本地 .data/ 文件。
//   本路由作为 GitHub Contents API 的缓存代理,所有环境 (dev + prod) 都通过
//   此路由获取 .data/ 文件,带有 5 分钟内存缓存以减少 GitHub API 调用。
//
//   本地 .data/ 文件只给 scripts/ (generator 等) 使用,不通过 web 访问。
//   如需修改本地数据测试,请 push 到 GitHub 仓库。

export const runtime = "edge";

import { NextResponse } from "next/server";

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

// In-memory cache
const fileCache = new Map<string, { data: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const segments = path;
  const cacheKey = segments.join("/");

  // 1. 检查内存缓存
  const cached = fileCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return new NextResponse(cached.data, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // 2. 从 GitHub Contents API 获取
  try {
    const repo = getGitRepo();
    const url = `https://api.github.com/repos/${repo}/contents/.data/${segments.join("/")}`;
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
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const content = await res.text();

    // 缓存结果
    fileCache.set(cacheKey, {
      data: content,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return new NextResponse(content, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
