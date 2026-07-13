// GET /api/data/index — global index (date list + totals).
import { NextResponse } from "next/server";
import { readJson, dataPath, listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { DataIndex, Platform } from "@/lib/affiliate/types";
import { PLATFORMS } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureDataRoot();
  const idx = readJson<DataIndex>(dataPath("index.json"));
  if (idx) return NextResponse.json(idx);

  // Reconstruct index from filesystem if missing.
  const dates = listDates();
  const totals: DataIndex["totals"] = {};
  for (const date of dates) {
    const summary = readJson<{ totalCount: number; platforms: Record<Platform, { count: number }> }>(
      dataPath(date, "summary.json"),
    );
    if (summary) {
      totals[date] = {
        amazon: summary.platforms.amazon?.count ?? 0,
        taobao: summary.platforms.taobao?.count ?? 0,
        jd: summary.platforms.jd?.count ?? 0,
        google: summary.platforms.google?.count ?? 0,
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
