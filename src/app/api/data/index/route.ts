// GET /api/data/index — global index (date list + totals).
export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DataIndex, Platform } from "@/lib/affiliate/types";
import { PLATFORMS } from "@/lib/affiliate/types";

export async function GET() {
  const idx = await readJson<DataIndex>("index.json");
  if (idx) return NextResponse.json(idx);

  // Reconstruct index from data if missing
  const dates = await listDates();
  const totals: DataIndex["totals"] = {};
  for (const date of dates) {
    const summary = await readJson<{ totalCount: number; platforms: Record<Platform, { count: number }> }>(date, "summary.json");
    if (summary) {
      totals[date] = {
        amazon: summary.platforms?.amazon?.count ?? 0,
        taobao: summary.platforms?.taobao?.count ?? 0,
        jd: summary.platforms?.jd?.count ?? 0,
        total: summary.totalCount ?? 0,
      };
    }
  }
  const rebuilt: DataIndex = {
    updatedAt: new Date().toISOString(),
    dates,
    platforms: PLATFORMS,
    totals,
  };
  return NextResponse.json(rebuilt);
}
