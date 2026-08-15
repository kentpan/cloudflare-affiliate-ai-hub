// GET /data/[...path] — 数据文件读取路由。
//
// Edge runtime (兼容 @cloudflare/next-on-pages 构建)。
//
// 设计说明 (2026-08 重构):
//   数据已随站点部署为静态文件 (public/data/* → /data/*), 且 _routes.json
//   将 /data/* 排除在 worker 之外, 外部浏览器请求直接命中静态文件。
//   但 worker 内部 (readJson → fetch("/data/...")) 的 self-fetch 仍会进入本路由,
//   因此这里优先通过 env.ASSETS.fetch() 读取同源静态文件,
//   找不到时才回退到 GitHub Contents API (兼容未部署数据的开发场景)。
//
//   带 5 分钟内存缓存减少重复请求。

export const runtime = "edge";

import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

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
  request: Request,
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

  const contentType = "application/json; charset=utf-8";

  // 2. 优先读同源静态文件 (public/data/* 已随站点部署为 /data/*)
  try {
    const { env } = getRequestContext<{ ASSETS: Fetcher }>();
    if (env?.ASSETS?.fetch) {
      const url = new URL(`/data/${segments.join("/")}`, request.url);
      const assetRes = await env.ASSETS.fetch(url.toString());
      if (assetRes.ok) {
        const content = await assetRes.text();
        fileCache.set(cacheKey, {
          data: content,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return new NextResponse(content, { headers: { "Content-Type": contentType } });
      }
    }
  } catch {
    // getRequestContext 在非 Cloudflare 环境 (如纯 Next dev) 不可用 → fallback
  }

  // 3. Fallback: 从 GitHub Contents API 获取
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
