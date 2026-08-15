#!/usr/bin/env node
// Rebuild .data/index.json by scanning the actual data directories.
//
// Why: index.json is normally written by generator.ts with only the dates
// generated in the current repo history. After data migration / rebase, the
// directory may contain more dates than index.json records (e.g. 37 dirs but
// index.dates = ["2026-08-15"]). That breaks:
//   - /api/comparison  (no previous day - risingStars empty)
//   - /api/trend-compare (fewer dates to compare)
//   - trend sparkline / wordcloud latest-date resolution
//
// This script scans dataDir/YYYY-MM-DD dirs and rebuilds index.json with the
// full sorted date list, preserving any existing totals and adding missing dates.
//
// Usage:  node scripts/rebuild-index.mjs [dataDir]   (default ./.data)
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.argv[2] ?? "./.data");
const indexPath = path.join(dataDir, "index.json");

// Known platforms (matches src/lib/affiliate/types.ts PLATFORMS)
const PLATFORMS = ["amazon", "taobao", "jd", "google", "pdd", "douyin", "kuaishou", "xhs"];

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function dirs() {
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map((e) => e.name);
}

function summarizeDay(day) {
  const dir = path.join(dataDir, day);
  const summary = readJsonSafe(path.join(dir, "summary.json"));
  if (!summary) return null;
  const picks = Array.isArray(summary.topPicks) ? summary.topPicks : [];
  const totals = {};
  let total = 0;
  for (const p of picks) {
    const plat = String(p.platform || "").toLowerCase();
    if (!plat) continue;
    totals[plat] = (totals[plat] || 0) + 1;
    total++;
  }
  // Fill all known platforms (missing = 0) for a consistent shape
  for (const plat of PLATFORMS) {
    if (!totals[plat]) totals[plat] = 0;
  }
  totals.total = total;
  return totals;
}

function main() {
  if (!fs.existsSync(indexPath)) {
    console.error(`[rebuild-index] index.json not found at ${indexPath}`);
    process.exit(1);
  }

  const existing = readJsonSafe(indexPath) ?? { dates: [], platforms: PLATFORMS, totals: {} };

  const days = dirs().sort(); // ascending YYYY-MM-DD

  const dates = [...days].sort().reverse(); // newest first (matches generator)
  const totals = { ...(existing.totals ?? {}) };
  const platforms = Array.isArray(existing.platforms) && existing.platforms.length
    ? existing.platforms
    : PLATFORMS;

  let added = 0;
  for (const day of days) {
    if (!totals[day]) {
      const t = summarizeDay(day);
      if (t) {
        totals[day] = t;
        added++;
      }
    }
  }

  const index = {
    updatedAt: new Date().toISOString(),
    dates,
    platforms,
    totals,
  };

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`[rebuild-index] ✓ ${days.length} days, ${dates.length} dates in index (added ${added} totals)`);
  console.log(`[rebuild-index] dates: ${dates.slice(0, 5).join(", ")}${dates.length > 5 ? ", ..." : ""}`);
}

main();
