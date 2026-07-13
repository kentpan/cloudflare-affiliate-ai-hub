// Historical comparison — computes "new entrants", "rising stars", and
// per-product growth deltas by comparing today's picks vs yesterday's.
// Mirrors the awesome-trending-repos "historical comparison" feature.

import { readJson, dataPath, listDates } from "./data-writer";
import type { PickedProduct, DailySummary } from "./types";

export interface ProductComparison {
  id: string;
  platform: string;
  title: string;
  todayScore: number;
  yesterdayScore: number | null; // null = new entrant
  scoreDelta: number | null; // today - yesterday; null = new
  expectedRevenue: number;
  todayRank: number;
  yesterdayRank: number | null;
  rankDelta: number | null; // yesterday - today (positive = improved)
  isNew: boolean;
  isRising: boolean; // scoreDelta >= threshold
}

export interface DailyComparison {
  date: string;
  previousDate: string | null;
  totalToday: number;
  totalYesterday: number;
  newEntrants: PickedProduct[];
  risingStars: ProductComparison[]; // sorted by scoreDelta desc
  topGainers: ProductComparison[]; // top 10 by scoreDelta
  avgScoreToday: number;
  avgScoreYesterday: number | null;
  avgScoreDelta: number | null;
  comparisons: ProductComparison[];
}

const RISING_THRESHOLD = 2; // score delta >= 2 to count as "rising"

export function getDailyComparison(date?: string): DailyComparison | null {
  const dates = listDates();
  if (dates.length === 0) return null;
  const today = date ?? dates[0];
  const todayIdx = dates.indexOf(today);
  const yesterday = todayIdx >= 0 && todayIdx + 1 < dates.length ? dates[todayIdx + 1] : null;

  const todaySummary = readJson<DailySummary>(dataPath(today, "summary.json"));
  if (!todaySummary) return null;

  const yesterdaySummary = yesterday
    ? readJson<DailySummary>(dataPath(yesterday, "summary.json"))
    : null;

  const todayPicks = todaySummary.topPicks ?? [];
  const yesterdayPicks = yesterdaySummary?.topPicks ?? [];

  // Build lookup by title (products regenerate daily with new ids, so match
  // by normalized title which is stable for the same product).
  const yByTitle = new Map<string, { p: PickedProduct; rank: number }>();
  const ySorted = [...yesterdayPicks].sort((a, b) => b.score - a.score);
  ySorted.forEach((p, i) => {
    yByTitle.set(normalizeTitle(p.title), { p, rank: i + 1 });
  });

  const todaySorted = [...todayPicks].sort((a, b) => b.score - a.score);
  const comparisons: ProductComparison[] = [];
  const newEntrants: PickedProduct[] = [];
  const rising: ProductComparison[] = [];

  todaySorted.forEach((p, idx) => {
    const todayRank = idx + 1;
    const y = yByTitle.get(normalizeTitle(p.title));
    const yesterdayScore = y?.p.score ?? null;
    const yesterdayRank = y?.rank ?? null;
    const scoreDelta = yesterdayScore !== null ? round2(p.score - yesterdayScore) : null;
    const rankDelta = yesterdayRank !== null ? yesterdayRank - todayRank : null;
    const isNew = yesterdayScore === null;
    const isRising = scoreDelta !== null && scoreDelta >= RISING_THRESHOLD;

    const cmp: ProductComparison = {
      id: p.id,
      platform: p.platform,
      title: p.title,
      todayScore: p.score,
      yesterdayScore,
      scoreDelta,
      expectedRevenue: p.expectedRevenue,
      todayRank,
      yesterdayRank,
      rankDelta,
      isNew,
      isRising,
    };
    comparisons.push(cmp);
    if (isNew) newEntrants.push(p);
    if (isRising) rising.push(cmp);
  });

  rising.sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0));

  const avgToday = avg(todayPicks.map((p) => p.score));
  const avgYesterday = yesterdayPicks.length
    ? avg(yesterdayPicks.map((p) => p.score))
    : null;

  return {
    date: today,
    previousDate: yesterday,
    totalToday: todayPicks.length,
    totalYesterday: yesterdayPicks.length,
    newEntrants,
    risingStars: rising.slice(0, 10),
    topGainers: rising.slice(0, 10),
    avgScoreToday: avgToday,
    avgScoreYesterday: avgYesterday,
    avgScoreDelta: avgYesterday !== null ? round2(avgToday - avgYesterday) : null,
    comparisons,
  };
}

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "")
    .slice(0, 60);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return round2(arr.reduce((s, v) => s + v, 0) / arr.length);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
