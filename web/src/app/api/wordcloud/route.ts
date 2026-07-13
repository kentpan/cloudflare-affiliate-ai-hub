// GET /api/wordcloud?date=YYYY-MM-DD&field=tags|category|direction
// Returns word frequency data for word cloud visualization.
// field: "tags" (AI tags), "category" (商品类目), "direction" (选品方向)

import { NextResponse } from "next/server";
import { readJson, dataPath, listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

interface WordFreq {
  text: string;
  value: number;
  avgScore: number;
  virtualCount: number;
}

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");
  const field = (searchParams.get("field") ?? "tags").toLowerCase();

  if (!date) {
    const dates = listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }

  const summary = readJson<DailySummary>(dataPath(date, "summary.json"));
  if (!summary) {
    return NextResponse.json({ error: "not found", date }, { status: 404 });
  }

  const picks = summary.topPicks ?? [];
  const freq = new Map<string, { count: number; scoreSum: number; virtual: number }>();

  for (const p of picks) {
    const words = extractWords(p, field);
    for (const w of words) {
      const cur = freq.get(w) ?? { count: 0, scoreSum: 0, virtual: 0 };
      cur.count += 1;
      cur.scoreSum += p.score;
      if (p.isVirtual) cur.virtual += 1;
      freq.set(w, cur);
    }
  }

  const words: WordFreq[] = [...freq.entries()]
    .map(([text, v]) => ({
      text,
      value: v.count,
      avgScore: Math.round((v.scoreSum / v.count) * 10) / 10,
      virtualCount: v.virtual,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  return NextResponse.json({
    date,
    field,
    totalProducts: picks.length,
    uniqueWords: freq.size,
    words,
  });
}

function extractWords(p: PickedProduct, field: string): string[] {
  switch (field) {
    case "tags":
      return (p.aiTags ?? []).filter(Boolean);
    case "category":
      return p.category ? [p.category] : [];
    case "direction":
      return p.directionId ? [p.directionId] : [];
    default:
      return (p.aiTags ?? []).filter(Boolean);
  }
}
