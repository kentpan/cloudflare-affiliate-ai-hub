// GET /api/data/dates — list of available dates (newest first).
//
// Edge runtime (required by @cloudflare/next-on-pages for CF Pages deployment).
//
// Uses listDates() from data-writer which:
//   1. Reads index.json (via /data/index.json route → local fs or GitHub API)
//   2. Probes today's summary.json if not in index (auto-switch for today's data)
//   3. Returns merged, deduplicated, sorted date list

export const runtime = "edge";

import { NextResponse } from "next/server";
import { listDates } from "@/lib/affiliate/data-writer";

export async function GET() {
  const dates = await listDates();
  return NextResponse.json({ dates });
}
