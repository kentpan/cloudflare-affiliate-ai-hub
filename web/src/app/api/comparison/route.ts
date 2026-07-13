// GET /api/comparison?date=YYYY-MM-DD — historical comparison vs previous day
// (new entrants, rising stars, growth deltas). Mirrors trending-repos feature.

import { NextResponse } from "next/server";
import { getDailyComparison } from "@/lib/affiliate/comparison";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const cmp = getDailyComparison(date);
  if (!cmp) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }
  return NextResponse.json(cmp);
}
