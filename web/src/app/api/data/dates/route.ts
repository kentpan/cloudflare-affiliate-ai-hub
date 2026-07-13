// GET /api/data/dates — list of available dates (newest first).
import { NextResponse } from "next/server";
import { listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureDataRoot();
  return NextResponse.json({ dates: listDates() });
}
