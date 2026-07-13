// GET /api/data/summary?date=YYYY-MM-DD — daily summary + top picks.
import { NextResponse } from "next/server";
import { readJson, dataPath, ensureDataRoot, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");

  if (!date) {
    const dates = listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data yet" }, { status: 404 });
  }

  const summary = readJson<DailySummary>(dataPath(date, "summary.json"));
  if (!summary) {
    return NextResponse.json({ error: "not found", date }, { status: 404 });
  }
  return NextResponse.json(summary);
}
