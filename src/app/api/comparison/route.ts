// GET /api/comparison?date=YYYY-MM-DD — historical comparison vs previous day
export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct } from "@/lib/affiliate/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;

  const dates = await listDates();
  const today = date ?? dates[0];
  if (!today) return NextResponse.json({ error: "no data" }, { status: 404 });

  const todayIdx = dates.indexOf(today);
  const yesterday = todayIdx >= 0 && todayIdx + 1 < dates.length ? dates[todayIdx + 1] : null;

  const todaySummary = await readJson<DailySummary>(today, "summary.json");
  if (!todaySummary) return NextResponse.json({ error: "not found", date: today }, { status: 404 });

  const yesterdaySummary = yesterday ? await readJson<DailySummary>(yesterday, "summary.json") : null;

  const todayPicks = todaySummary.topPicks ?? [];
  const yesterdayPicks = yesterdaySummary?.topPicks ?? [];

  const yByTitle = new Map<string, { p: PickedProduct; rank: number }>();
  const ySorted = [...yesterdayPicks].sort((a, b) => b.score - a.score);
  ySorted.forEach((p, i) => {
    const norm = p.title.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9\u4e00-\u9fa5]/g, "").slice(0, 60);
    yByTitle.set(norm, { p, rank: i + 1 });
  });

  const todaySorted = [...todayPicks].sort((a, b) => b.score - a.score);
  const comparisons = [];
  const newEntrants: PickedProduct[] = [];
  const rising = [];

  for (const [idx, p] of todaySorted.entries()) {
    const todayRank = idx + 1;
    const norm = p.title.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9\u4e00-\u9fa5]/g, "").slice(0, 60);
    const y = yByTitle.get(norm);
    const yesterdayScore = y?.p.score ?? null;
    const yesterdayRank = y?.rank ?? null;
    const scoreDelta = yesterdayScore !== null ? Math.round((p.score - yesterdayScore) * 10) / 10 : null;
    const rankDelta = yesterdayRank !== null ? yesterdayRank - todayRank : null;
    const isNew = yesterdayScore === null;
    const isRising = scoreDelta !== null && scoreDelta >= 2;

    comparisons.push({
      id: p.id, platform: p.platform, title: p.title,
      todayScore: p.score, yesterdayScore, scoreDelta,
      expectedRevenue: p.expectedRevenue, todayRank, yesterdayRank, rankDelta,
      isNew, isRising,
    });
    if (isNew) newEntrants.push(p);
    if (isRising) rising.push(comparisons[comparisons.length - 1]);
  }

  rising.sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0));

  const avgToday = todayPicks.length ? Math.round((todayPicks.reduce((s, p) => s + p.score, 0) / todayPicks.length) * 10) / 10 : 0;
  const avgYesterday = yesterdayPicks.length ? Math.round((yesterdayPicks.reduce((s, p) => s + p.score, 0) / yesterdayPicks.length) * 10) / 10 : null;

  return NextResponse.json({
    date: today, previousDate: yesterday,
    totalToday: todayPicks.length, totalYesterday: yesterdayPicks.length,
    newEntrants, risingStars: rising.slice(0, 10), topGainers: rising.slice(0, 10),
    avgScoreToday: avgToday, avgScoreYesterday: avgYesterday,
    avgScoreDelta: avgYesterday !== null ? Math.round((avgToday - avgYesterday) * 10) / 10 : null,
    comparisons,
  });
}
