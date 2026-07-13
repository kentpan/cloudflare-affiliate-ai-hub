// GET /api/trend — 7-day trend data for the hero sparkline.
// Returns daily totals + avgScore + totalExpectedRevenue + virtualRatio
// for the most recent 7 days (oldest → newest).

import { NextResponse } from "next/server";
import { readJson, dataPath, listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { DailySummary } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureDataRoot();
  const dates = listDates(); // newest first
  const recent = dates.slice(0, 7).reverse(); // oldest → newest, max 7

  const points = recent.map((date) => {
    const s = readJson<DailySummary>(dataPath(date, "summary.json"));
    const topPicks = s?.topPicks ?? [];
    const virtualCount = topPicks.filter((p) => p.isVirtual).length;
    return {
      date,
      total: s?.totalCount ?? topPicks.length,
      avgScore: s?.avgScore ?? 0,
      totalExpectedRevenue: s?.totalExpectedRevenue ?? 0,
      virtualCount,
      virtualRatio: topPicks.length ? +(virtualCount / topPicks.length * 100).toFixed(1) : 0,
    };
  });

  return NextResponse.json({
    points,
    span: points.length,
    latest: points[points.length - 1] ?? null,
  });
}
