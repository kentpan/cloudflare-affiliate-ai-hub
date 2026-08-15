// GET /api/export-all?format=json
// Exports ALL dates' top picks as a single JSON.
// (ZIP format not supported on edge runtime — use JSON instead)


export const runtime = "edge";
import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary } from "@/lib/affiliate/types";

export const maxDuration = 120;

export async function GET(request: Request) {
  
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "json").toLowerCase();
  const dates = await listDates();

  if (dates.length === 0) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }

  const summaries: Array<{ date: string; summary: DailySummary | null }> = await Promise.all(
    dates.map(async (d) => ({
      date: d,
      summary: await readJson<DailySummary>(d, "summary.json"),
    })),
  );

  if (format === "json") {
    const all = summaries
      .filter((s) => s.summary)
      .map((s) => ({ date: s.date, ...s.summary }));
    return new NextResponse(JSON.stringify({ dates: all }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="affiliate-all-dates.json"`,
      },
    });
  }

  // ZIP not supported on edge — return JSON instead
  return NextResponse.json({
    error: "ZIP format not supported on edge runtime. Use format=json instead.",
    dates: summaries.filter((s) => s.summary).map((s) => ({ date: s.date, ...s.summary })),
  });
}
