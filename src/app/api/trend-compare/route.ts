// GET /api/trend-compare?from=YYYY-MM-DD&to=YYYY-MM-DD

export const runtime = "edge";

// Compares two dates' selection data: platform deltas, category shifts,
// new/lost products, score/revenue changes. Mirrors the trending-repos
// "historical comparison" feature at a multi-day scale.

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary, Platform, PickedProduct } from "@/lib/affiliate/types";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/affiliate/types";


interface PlatformDelta {
  platform: Platform;
  label: string;
  fromCount: number;
  toCount: number;
  countDelta: number;
  fromAvgScore: number;
  toAvgScore: number;
  scoreDelta: number;
  fromRevenue: number;
  toRevenue: number;
  revenueDelta: number;
}

interface CategoryShift {
  category: string;
  fromCount: number;
  toCount: number;
  delta: number;
  trend: "up" | "down" | "same" | "new" | "gone";
}

interface TrendCompareResult {
  from: string;
  to: string;
  fromTotal: number;
  toTotal: number;
  totalDelta: number;
  fromAvgScore: number;
  toAvgScore: number;
  avgScoreDelta: number;
  fromRevenue: number;
  toRevenue: number;
  revenueDelta: number;
  fromVirtualRatio: number;
  toVirtualRatio: number;
  virtualRatioDelta: number;
  platforms: PlatformDelta[];
  categoryShifts: CategoryShift[];
  newProducts: PickedProduct[];
  lostProductTitles: string[];
}

export async function GET(request: Request) {
  
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dates = await listDates(); // newest first

  const fromDate = from ?? dates[dates.length - 1];
  const toDate = to ?? dates[0];
  if (!fromDate || !toDate) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }

  const fromSummary = await await readJson<DailySummary>(fromDate, "summary.json");
  const toSummary = await await readJson<DailySummary>(toDate, "summary.json");
  if (!fromSummary || !toSummary) {
    return NextResponse.json(
      { error: "summary not found", from: fromDate, to: toDate },
      { status: 404 },
    );
  }

  const fromPicks = fromSummary.topPicks ?? [];
  const toPicks = toSummary.topPicks ?? [];

  // Platform deltas
  const platforms: PlatformDelta[] = PLATFORMS.map((p) => {
    const f = fromSummary.platforms[p] ?? { count: 0, avgScore: 0, totalExpectedRevenue: 0 };
    const t = toSummary.platforms[p] ?? { count: 0, avgScore: 0, totalExpectedRevenue: 0 };
    return {
      platform: p,
      label: PLATFORM_LABELS[p],
      fromCount: f.count,
      toCount: t.count,
      countDelta: t.count - f.count,
      fromAvgScore: f.avgScore ?? 0,
      toAvgScore: t.avgScore ?? 0,
      scoreDelta: (t.avgScore ?? 0) - (f.avgScore ?? 0),
      fromRevenue: f.totalExpectedRevenue ?? 0,
      toRevenue: t.totalExpectedRevenue ?? 0,
      revenueDelta: (t.totalExpectedRevenue ?? 0) - (f.totalExpectedRevenue ?? 0),
    };
  });

  // Category shifts
  const fromCats = countBy(fromPicks, (p) => p.category || "未分类");
  const toCats = countBy(toPicks, (p) => p.category || "未分类");
  const allCats = Array.from(new Set([...fromCats.keys(), ...toCats.keys()]));
  const categoryShifts: CategoryShift[] = allCats
    .map((cat) => {
      const fc = fromCats.get(cat) ?? 0;
      const tc = toCats.get(cat) ?? 0;
      const delta = tc - fc;
      let trend: CategoryShift["trend"] = "same";
      if (fc === 0) trend = "new";
      else if (tc === 0) trend = "gone";
      else if (delta > 0) trend = "up";
      else if (delta < 0) trend = "down";
      return { category: cat, fromCount: fc, toCount: tc, delta, trend };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // New / lost products (by normalized title)
  const fromTitles = new Set(fromPicks.map((p) => normalize(p.title)));
  const toTitles = new Set(toPicks.map((p) => normalize(p.title)));
  const newProducts = toPicks.filter((p) => !fromTitles.has(normalize(p.title)));
  const lostProductTitles = fromPicks
    .filter((p) => !toTitles.has(normalize(p.title)))
    .map((p) => p.title);

  const fromVirtual = fromPicks.filter((p) => p.isVirtual).length;
  const toVirtual = toPicks.filter((p) => p.isVirtual).length;

  const result: TrendCompareResult = {
    from: fromDate,
    to: toDate,
    fromTotal: fromSummary.totalCount ?? fromPicks.length,
    toTotal: toSummary.totalCount ?? toPicks.length,
    totalDelta: (toSummary.totalCount ?? toPicks.length) - (fromSummary.totalCount ?? fromPicks.length),
    fromAvgScore: fromSummary.avgScore ?? 0,
    toAvgScore: toSummary.avgScore ?? 0,
    avgScoreDelta: (toSummary.avgScore ?? 0) - (fromSummary.avgScore ?? 0),
    fromRevenue: fromSummary.totalExpectedRevenue ?? 0,
    toRevenue: toSummary.totalExpectedRevenue ?? 0,
    revenueDelta: (toSummary.totalExpectedRevenue ?? 0) - (fromSummary.totalExpectedRevenue ?? 0),
    fromVirtualRatio: fromPicks.length ? round1((fromVirtual / fromPicks.length) * 100) : 0,
    toVirtualRatio: toPicks.length ? round1((toVirtual / toPicks.length) * 100) : 0,
    virtualRatioDelta: round1(
      (toPicks.length ? (toVirtual / toPicks.length) * 100 : 0) -
        (fromPicks.length ? (fromVirtual / fromPicks.length) * 100 : 0),
    ),
    platforms,
    categoryShifts: categoryShifts.slice(0, 12),
    newProducts: newProducts.slice(0, 10),
    lostProductTitles: lostProductTitles.slice(0, 10),
  };

  return NextResponse.json(result);
}

function countBy<T>(arr: T[], keyFn: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of arr) {
    const k = keyFn(x);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function normalize(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "")
    .slice(0, 60);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
