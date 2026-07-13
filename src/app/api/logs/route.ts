// GET /api/logs — recent generation log entries.

export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson } from "@/lib/affiliate/data-writer";
import type { GenerationLogEntry } from "@/lib/affiliate/types";


export async function GET() {
  
  const log = await await readJson<GenerationLogEntry[]>("generation-log.json") ?? [];
  return NextResponse.json({ logs: log.slice(0, 30) });
}
