// GET /api/data/summary?date=YYYY-MM-DD — daily summary + top picks.
export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary } from "@/lib/affiliate/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");

  if (!date) {
    const dates = await listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data yet" }, { status: 404 });
  }

  const summary = await readJson<DailySummary>(date, "summary.json");
  if (!summary) {
    return NextResponse.json({ error: "not found", date }, { status: 404 });
  }
  return NextResponse.json(summary);
}
