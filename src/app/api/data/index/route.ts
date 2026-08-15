// GET /api/data/index — global index (date list + totals).
// 始终从实际数据重建索引，不盲目信任可能陈旧的 index.json。
export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DataIndex, Platform } from "@/lib/affiliate/types";
import { PLATFORMS } from "@/lib/affiliate/types";

export async function GET() {
  const idx = await readJson<DataIndex>("index.json");
  // 从实际数据目录获取完整日期列表（而非依赖可能陈旧的 index.json）
  const dates = await listDates();

  // 如果 index.json 的日期与实际情况一致，直接返回（避免重复请求 summary.json）
  if (idx && dates.length === idx.dates.length && dates.every((d, i) => d === idx.dates[i])) {
    return NextResponse.json(idx);
  }

  // index.json 陈旧或缺失 → 从实际数据重建索引
  const totals: DataIndex["totals"] = {};
  for (const date of dates) {
    const summary = await readJson<{ totalCount: number; platforms: Record<Platform, { count: number }> }>(date, "summary.json");
    if (summary) {
      totals[date] = {
        amazon: summary.platforms?.amazon?.count ?? 0,
        taobao: summary.platforms?.taobao?.count ?? 0,
        jd: summary.platforms?.jd?.count ?? 0,
        google: summary.platforms?.google?.count ?? 0,
        total: summary.totalCount ?? 0,
      };
    }
  }
  const rebuilt: DataIndex = {
    updatedAt: idx?.updatedAt ?? new Date().toISOString(),
    dates,
    platforms: PLATFORMS,
    totals,
  };
  return NextResponse.json(rebuilt);
}
