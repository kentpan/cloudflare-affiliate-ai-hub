// GET /api/logs — recent generation log entries.
import { NextResponse } from "next/server";
import { readJson, dataPath, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { GenerationLogEntry } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureDataRoot();
  const log = readJson<GenerationLogEntry[]>(dataPath("generation-log.json")) ?? [];
  return NextResponse.json({ logs: log.slice(0, 30) });
}
