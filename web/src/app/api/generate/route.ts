// POST /api/generate
//   ?action=seed   → seed 3 days of historical data (no LLM)
//   ?action=today  → regenerate today's data with the LLM (default)
//   ?date=YYYY-MM-DD&useLlm=false → custom date, heuristic-only
//
// The LLM call respects the concurrency-limit retry policy configured in
// llm-client.ts (3s delay, 10 attempts) per the user's instruction.

import { NextResponse } from "next/server";
import { generateDaily, todayStr, ensureDataRoot } from "@/lib/affiliate/generator";
import { seedIfEmpty } from "@/lib/affiliate/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — LLM calls can be slow.

export async function POST(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const date = searchParams.get("date") ?? undefined;
  const useLlmParam = searchParams.get("useLlm");
  const useLlm = useLlmParam === null ? true : useLlmParam === "true";

  try {
    if (action === "seed") {
      const res = await seedIfEmpty();
      return NextResponse.json({ ok: true, ...res });
    }

    const result = await generateDaily({
      date: date ?? todayStr(),
      source: "manual",
      useLlm,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[generate] error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

// Also allow GET for quick "seed if empty" on first load.
export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") === "seed") {
    const res = await seedIfEmpty();
    return NextResponse.json({ ok: true, ...res });
  }
  return NextResponse.json({ ok: false, error: "use POST" }, { status: 405 });
}
