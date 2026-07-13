// GET /api/search?q=keyword&limit=30
// Cross-date full-text search across all dates' top picks.
// Returns matched products with their date + match context.

import { NextResponse } from "next/server";
import { readJson, dataPath, listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

interface SearchHit {
  date: string;
  product: PickedProduct;
  matchedFields: string[];
  snippet: string;
}

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10) || 30, 100);

  if (!q) {
    return NextResponse.json({ error: "missing q param", hits: [], total: 0 });
  }

  const dates = listDates();
  const hits: SearchHit[] = [];

  for (const date of dates) {
    const summary = readJson<DailySummary>(dataPath(date, "summary.json"));
    if (!summary?.topPicks) continue;
    for (const p of summary.topPicks) {
      const matchedFields: string[] = [];
      let snippet = "";

      if (p.title.toLowerCase().includes(q)) {
        matchedFields.push("标题");
        snippet = highlightSnippet(p.title, q);
      }
      if (p.category.toLowerCase().includes(q)) {
        matchedFields.push("类目");
        if (!snippet) snippet = p.category;
      }
      if (p.aiCopy?.toLowerCase().includes(q)) {
        matchedFields.push("AI文案");
        if (!snippet) snippet = highlightSnippet(p.aiCopy, q);
      }
      if (p.reason?.toLowerCase().includes(q)) {
        matchedFields.push("推荐理由");
        if (!snippet) snippet = highlightSnippet(p.reason, q);
      }
      if (p.aiTags?.some((t) => t.toLowerCase().includes(q))) {
        matchedFields.push("标签");
        const tag = p.aiTags.find((t) => t.toLowerCase().includes(q));
        if (!snippet && tag) snippet = tag;
      }
      if (p.shopName?.toLowerCase().includes(q)) {
        matchedFields.push("店铺");
        if (!snippet) snippet = p.shopName;
      }

      if (matchedFields.length > 0) {
        hits.push({ date, product: p, matchedFields, snippet });
        if (hits.length >= limit) break;
      }
    }
    if (hits.length >= limit) break;
  }

  // Sort by score desc
  hits.sort((a, b) => b.product.score - a.product.score);

  return NextResponse.json({
    q,
    total: hits.length,
    limit,
    searchedDates: dates.length,
    hits,
  });
}

function highlightSnippet(text: string, q: string): string {
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text.slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + q.length + 30);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
