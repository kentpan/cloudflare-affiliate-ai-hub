// GET /api/data/platform?date=YYYY-MM-DD&platform=amazon|taobao|jd|google
import { NextResponse } from "next/server";
import { readJson, dataPath, ensureDataRoot, listDates } from "@/lib/affiliate/data-writer";
import type { PickedProduct, Platform } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

const VALID: Platform[] = ["amazon", "taobao", "jd", "google"];

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");
  const platform = searchParams.get("platform") as Platform | null;

  if (!platform || !VALID.includes(platform)) {
    return NextResponse.json({ error: "invalid platform" }, { status: 400 });
  }
  if (!date) {
    const dates = listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data yet" }, { status: 404 });
  }

  const items = readJson<PickedProduct[]>(dataPath(date, `${platform}.json`));
  return NextResponse.json({ date, platform, items: items ?? [] });
}
