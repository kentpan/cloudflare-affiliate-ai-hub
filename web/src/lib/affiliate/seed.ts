// Seed script — generates 3 days of historical affiliate pick data using
// the heuristic fallback (no LLM quota burned). Run once at first boot.
//
// Invoked from the API route /api/generate?action=seed or directly.

import { generateDaily, ensureDataRoot, todayStr } from "./generator";
import { readJson, dataPath } from "./data-writer";
import type { DataIndex } from "./types";

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export async function seedIfEmpty(): Promise<{ seeded: boolean; dates: string[] }> {
  ensureDataRoot();
  const index = readJson<DataIndex>(dataPath("index.json"));
  if (index && index.dates && index.dates.length > 0) {
    return { seeded: false, dates: index.dates };
  }
  console.log("[seed] no data found, generating 3 days of seed data...");
  const dates: string[] = [];
  for (const offset of [2, 1, 0]) {
    const date = dateOffset(offset);
    const res = await generateDaily({ date, source: "seed", useLlm: false });
    dates.push(res.date);
    console.log(`[seed] done ${res.date} total=${res.total}`);
  }
  return { seeded: true, dates };
}

export { todayStr };
