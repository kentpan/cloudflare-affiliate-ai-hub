// GET /api/category-trends?days=7|14|30
// Returns category trend data over N days.
export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary } from "@/lib/affiliate/types";

interface CategoryDayData {
  date: string;
  count: number;
  avgScore: number;
  totalRevenue: number;
}

interface CategoryTrend {
  category: string;
  data: CategoryDayData[];
  totalCount: number;
  trend: "up" | "down" | "stable" | "new";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "7", 10) || 7, 30);

  const allDates = await listDates();
  const dates = allDates.slice(0, days).reverse();

  if (dates.length === 0) {
    return NextResponse.json({ categories: [], days, dates: [] });
  }

  const categoryMap = new Map<string, CategoryDayData[]>();

  for (const date of dates) {
    const summary = await readJson<DailySummary>(date, "summary.json");
    if (!summary?.topPicks) continue;

    const catStats = new Map<string, { count: number; scoreSum: number; revenue: number }>();
    for (const p of summary.topPicks) {
      const cat = p.category || "未分类";
      const cur = catStats.get(cat) ?? { count: 0, scoreSum: 0, revenue: 0 };
      cur.count += 1;
      cur.scoreSum += p.score;
      cur.revenue += p.expectedRevenue;
      catStats.set(cat, cur);
    }

    for (const [cat, stats] of catStats) {
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push({
        date,
        count: stats.count,
        avgScore: Math.round((stats.scoreSum / stats.count) * 10) / 10,
        totalRevenue: Math.round(stats.revenue * 100) / 100,
      });
    }
  }

  const categories: CategoryTrend[] = [...categoryMap.entries()]
    .map(([category, data]) => {
      const totalCount = data.reduce((s, d) => s + d.count, 0);
      let trend: CategoryTrend["trend"] = "stable";
      if (data.length >= 4) {
        const recent = data.slice(-3).reduce((s, d) => s + d.count, 0) / 3;
        const previous = data.slice(-6, -3).reduce((s, d) => s + d.count, 0) / 3;
        if (recent > previous * 1.15) trend = "up";
        else if (recent < previous * 0.85) trend = "down";
      } else if (data.length <= 2) {
        trend = "new";
      }
      return { category, data, totalCount, trend };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  return NextResponse.json({
    categories,
    days,
    dates,
    totalCategories: categories.length,
  });
}
