// GET /api/data/dimension?date=YYYY-MM-DD&name=by-platform|by-category|by-commission|by-price-range
import { NextResponse } from "next/server";
import { readJson, dataPath, ensureDataRoot, listDates } from "@/lib/affiliate/data-writer";
import type { DimensionFile, DimensionName } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

const VALID: DimensionName[] = ["by-platform", "by-category", "by-commission", "by-price-range"];

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");
  const name = searchParams.get("name") as DimensionName | null;

  if (!name || !VALID.includes(name)) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }
  if (!date) {
    const dates = listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data yet" }, { status: 404 });
  }

  const data = readJson<DimensionFile>(dataPath(date, "dimensions", `${name}.json`));
  if (!data) {
    return NextResponse.json({ error: "not found", date, name }, { status: 404 });
  }
  return NextResponse.json(data);
}
