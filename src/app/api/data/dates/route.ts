// GET /api/data/dates — list of available dates (newest first).
export const runtime = "edge";

import { NextResponse } from "next/server";
import { listDates } from "@/lib/affiliate/data-writer";

export async function GET() {
  const dates = await listDates();
  return NextResponse.json({ dates });
}
