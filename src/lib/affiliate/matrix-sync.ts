/**
 * matrix-sync.ts — 矩阵管理系统(matrix-tentans)统一同步 SDK (Next.js 版本)。
 *
 * 各接入站点引入此文件后,即可通过 matrix-tentans 网关与其他站点互相同步数据,
 * 所有跨系统调用统一使用 `Authorization: Bearer <MATRIX_API_KEY>` 鉴权。
 *
 * 配置(.env):
 *   MATRIX_GATEWAY_URL  matrix-tentans 的公网地址(如 http://localhost:3002)
 *   MATRIX_API_KEY      从 matrix-tentans「API 密钥」页面生成的站点级密钥(32 hex)
 *
 * 用法:
 *   - 主动调用其他站点: await syncToSite('site_xxx', '/products', { method: 'GET' })
 *   - 接收 matrix-tentans 调用: verifyMatrixCall(request) // 不通过则返回 401 NextResponse
 */
import { NextRequest, NextResponse } from "next/server";

export interface MatrixConfig {
  gatewayUrl: string;
  apiKey: string;
}

export interface SyncOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
}

/** 读取 matrix-tentans 网关配置,未配置则返回 null。 */
export function getMatrixConfig(): MatrixConfig | null {
  const gatewayUrl = process.env.MATRIX_GATEWAY_URL || "";
  const apiKey = process.env.MATRIX_API_KEY || "";
  if (!gatewayUrl || !apiKey) return null;
  return { gatewayUrl, apiKey };
}

/**
 * 通过 matrix-tentans 网关调用其他站点的资源。
 * @param targetSiteId 目标站点 ID(在 matrix-tentans 站点管理中查看)
 * @param resource     资源路径(如 '/products'、'/api/items')
 * @param opts         请求选项(method/body/query/headers)
 */
export async function syncToSite<T = any>(
  targetSiteId: string,
  resource: string,
  opts: SyncOptions = {},
): Promise<T> {
  const cfg = getMatrixConfig();
  if (!cfg) {
    throw new Error("[matrix-sync] 未配置 MATRIX_GATEWAY_URL 或 MATRIX_API_KEY");
  }
  const url = new URL(
    `/api/gateway/${targetSiteId}${resource}`,
    cfg.gatewayUrl,
  );
  if (opts.query) {
    Object.entries(opts.query).forEach(([k, v]) =>
      url.searchParams.set(k, String(v)),
    );
  }
  const res = await fetch(url.toString(), {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[matrix-sync] ${opts.method || "GET"} ${url} failed: ${res.status} ${text}`,
    );
  }
  return (await res.json()) as T;
}

/**
 * 验证来自 matrix-tentans 网关的调用(站点端接收 matrix 调用时使用)。
 * 验证 `Authorization: Bearer <key>` 中的 key 是否匹配本站点配置的 MATRIX_API_KEY。
 *
 * @param request     NextRequest 对象
 * @param expectedKey 可选,自定义期望的 key(默认从 process.env.MATRIX_API_KEY 读取)
 * @returns 通过返回 null,不通过返回 401 NextResponse
 */
export function verifyMatrixCall(
  request: NextRequest,
  expectedKey?: string,
): NextResponse | null {
  const key = expectedKey || process.env.MATRIX_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "未配置 MATRIX_API_KEY" },
      { status: 503 },
    );
  }
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  if (!token || token !== key) {
    return NextResponse.json(
      { error: "无效的 Matrix API Key" },
      { status: 401 },
    );
  }
  return null;
}
