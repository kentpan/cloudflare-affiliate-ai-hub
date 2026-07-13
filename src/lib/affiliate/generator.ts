// Generator orchestrator — runs all platform adapters, AI analysis,
// dimension aggregation, writes the .data/{date}/* files, updates the
// global index, and pushes to RECEIVE_URL targets.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { AmazonAdapter } from "./adapters/amazon";
import { TaobaoAdapter } from "./adapters/taobao";
import { JdAdapter } from "./adapters/jd";
import { GoogleAdapter } from "./adapters/google";
import { analyze, heuristicFallback } from "./analyzer";
import {
  byPlatform,
  byCategory,
  byCommission,
  byPriceRange,
  round2,
} from "./aggregator";
import { config } from "./config";
import {
  getEnabledDirections,
  getAllActiveKeywords,
  matchDirection,
} from "./customization";
import { ensureDateDirSync, readJsonSync, writeJsonSync, dataPath } from "./node-data-writer";
import type {
  DataIndex,
  DailySummary,
  PickedProduct,
  Platform,
  GenerationLogEntry,
} from "./types";
import { PLATFORMS } from "./types";

export interface GenerateOptions {
  date?: string;
  source?: "manual" | "scheduled" | "seed";
  // When true, skip the LLM call and use the heuristic fallback (used for
  // seeding initial data without burning LLM quota).
  useLlm?: boolean;
}

export interface GenerateResult {
  date: string;
  totals: Record<Platform, { raw: number; picked: number }>;
  total: number;
  durationMs: number;
  llmUsed: boolean;
  llmAttempts: number;
  llmRetried: boolean;
}

export async function generateDaily(opts: GenerateOptions = {}): Promise<GenerateResult> {
  const start = Date.now();
  const date = opts.date ?? todayStr();
  const dir = ensureDateDirSync(date);
  const useLlm = opts.useLlm ?? true;

  // Overwrite semantics: if data for this date already exists (from an earlier
  // run today), it is fully replaced. writeJsonSync() uses fs.writeFileSync which
  // overwrites by default. This matches the requirement: manual trigger /
  // scheduled run / main-branch push all overwrite the same-day data with the
  // latest results. To preserve history, each date is a separate directory.
  const existingIndex = readJsonSync<{ updatedAt?: string }>(dataPath(date, "summary.json"));
  if (existingIndex) {
    console.log(`[generator] overwriting existing data for ${date}`);
  }

  // Read customization config (selection directions + keywords).
  const directions = getEnabledDirections();
  const activeKeywords = getAllActiveKeywords();
  console.log(
    `[generator] directions=${directions.length} keywords=${activeKeywords.length}`,
  );

  const adapters = [
    { name: "amazon" as const, adapter: new AmazonAdapter() },
    { name: "taobao" as const, adapter: new TaobaoAdapter() },
    { name: "jd" as const, adapter: new JdAdapter() },
    { name: "google" as const, adapter: new GoogleAdapter() },
  ];

  const platformResults: Record<Platform, { raw: number; picked: number; picks: PickedProduct[] }> = {
    amazon: { raw: 0, picked: 0, picks: [] },
    taobao: { raw: 0, picked: 0, picks: [] },
    jd: { raw: 0, picked: 0, picks: [] },
    google: { raw: 0, picked: 0, picks: [] },
  };

  for (const { name, adapter } of adapters) {
    try {
      const raw = await adapter.fetchTrending({ keywords: activeKeywords });
      console.log(`[${name}] raw=${raw.length}`);
      let picks: PickedProduct[] = [];
      let llmUsed = false;
      let llmAttempts = 0;
      let llmRetried = false;
      if (useLlm) {
        const res = await analyze(raw);
        picks = res.picks;
        llmUsed = res.llmUsed;
        llmAttempts = res.llmAttempts;
        llmRetried = res.llmRetried;
      } else {
        picks = heuristicFallback(raw);
        llmUsed = false;
      }
      // Tag each pick with its matched 选品方向 (direction).
      for (const p of picks) {
        const d = matchDirection(p, directions);
        p.directionId = d?.id ?? undefined;
      }
      console.log(`[${name}] picked=${picks.length} llmUsed=${llmUsed} attempts=${llmAttempts} retried=${llmRetried}`);
      platformResults[name] = { raw: raw.length, picked: picks.length, picks };
      writeJsonSync(path.join(dir, `${name}.json`), picks);
    } catch (e) {
      console.error(`[${name}] error:`, (e as Error).message);
      platformResults[name] = { raw: 0, picked: 0, picks: [] };
      writeJsonSync(path.join(dir, `${name}.json`), []);
    }
  }

  const all: PickedProduct[] = [
    ...platformResults.amazon.picks,
    ...platformResults.taobao.picks,
    ...platformResults.jd.picks,
    ...platformResults.google.picks,
  ].sort((a, b) => b.score - a.score);

  const summary: DailySummary = {
    date,
    generatedAt: new Date().toISOString(),
    platforms: PLATFORMS.reduce((acc, p) => {
      const picks = platformResults[p].picks;
      acc[p] = {
        count: picks.length,
        avgCommission: avg(picks.map((x) => x.commissionRate)),
        topCategory: top(picks.map((x) => x.category)) ?? "-",
        avgScore: avg(picks.map((x) => x.score)),
        totalExpectedRevenue: round2(picks.reduce((s, x) => s + x.expectedRevenue, 0)),
      };
      return acc;
    }, {} as DailySummary["platforms"]),
    topPicks: all.slice(0, 24),
    totalCount: all.length,
    avgScore: avg(all.map((x) => x.score)),
    totalExpectedRevenue: round2(all.reduce((s, x) => s + x.expectedRevenue, 0)),
  };
  writeJsonSync(path.join(dir, "summary.json"), summary);

  writeJsonSync(path.join(dir, "dimensions", "by-platform.json"), {
    dimension: "platform",
    groups: byPlatform(all),
  });
  writeJsonSync(path.join(dir, "dimensions", "by-category.json"), {
    dimension: "category",
    groups: byCategory(all),
  });
  writeJsonSync(path.join(dir, "dimensions", "by-commission.json"), {
    dimension: "commission",
    groups: byCommission(all),
  });
  writeJsonSync(path.join(dir, "dimensions", "by-price-range.json"), {
    dimension: "price-range",
    groups: byPriceRange(all),
  });

  // Update global index
  const indexPath = dataPath("index.json");
  const index: DataIndex = readJsonSync<DataIndex>(indexPath) ?? {
    updatedAt: new Date().toISOString(),
    dates: [],
    platforms: PLATFORMS,
    totals: {},
  };
  index.dates = Array.from(new Set([date, ...index.dates])).sort().reverse().slice(0, 60);
  index.totals[date] = {
    amazon: platformResults.amazon.picked,
    taobao: platformResults.taobao.picked,
    jd: platformResults.jd.picked,
    google: platformResults.google.picked,
    total: all.length,
  };
  index.updatedAt = new Date().toISOString();
  writeJsonSync(indexPath, index);

  // Append to generation log
  const logPath = dataPath("generation-log.json");
  const log = readJsonSync<GenerationLogEntry[]>(logPath) ?? [];
  const entry: GenerationLogEntry = {
    timestamp: new Date().toISOString(),
    date,
    platforms: PLATFORMS.reduce((acc, p) => {
      acc[p] = { raw: platformResults[p].raw, picked: platformResults[p].picked };
      return acc;
    }, {} as GenerationLogEntry["platforms"]),
    total: all.length,
    durationMs: Date.now() - start,
    source: opts.source ?? "manual",
    llmUsed: summary.platforms.amazon.count > 0, // best-effort flag
  };
  log.unshift(entry);
  writeJsonSync(logPath, log.slice(0, 100));

  // Webhook push (best-effort)
  await pushToTargets({ date, summary });

  // Auto-archive: archive dates older than 60 days (best-effort, non-blocking)
  try {
    autoArchiveOldDates(60);
  } catch (e) {
    console.warn("[generator] auto-archive failed (non-fatal):", (e as Error).message);
  }

  const durationMs = Date.now() - start;
  return {
    date,
    totals: PLATFORMS.reduce((acc, p) => {
      acc[p] = { raw: platformResults[p].raw, picked: platformResults[p].picked };
      return acc;
    }, {} as GenerateResult["totals"]),
    total: all.length,
    durationMs,
    llmUsed: useLlm,
    llmAttempts: 0,
    llmRetried: false,
  };
}

async function pushToTargets(payload: unknown): Promise<void> {
  const { urls, token } = config.push;
  if (urls.length === 0) return;
  await Promise.all(
    urls.map(async (url) => {
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "X-Source": "affiliate-ai-hub",
          },
          body: JSON.stringify(payload),
        });
        console.log(`[push] ok -> ${url}`);
      } catch (e) {
        console.error(`[push] fail -> ${url}:`, (e as Error).message);
      }
    }),
  );
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return round2(arr.reduce((s, v) => s + v, 0) / arr.length);
}
function top(arr: string[]): string | undefined {
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function todayStr(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

// Ensure the .data directory exists.
export function ensureDataRoot(): void {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
}

/**
 * Auto-archive dates older than `thresholdDays`.
 * Packs each old date dir into .data/_archive/{date}.tar.gz and removes
 * the active directory. Called automatically after each generate run.
 */
export function autoArchiveOldDates(thresholdDays: number): { archived: string[] } {
  const archiveDir = path.join(config.dataDir, "_archive");
  fs.mkdirSync(archiveDir, { recursive: true });
  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(config.dataDir)) return { archived: [] };
  const dates = fs
    .readdirSync(config.dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .filter((d) => now - new Date(d).getTime() > thresholdMs);

  const archived: string[] = [];
  for (const date of dates) {
    const srcDir = path.join(config.dataDir, date);
    const outFile = path.join(archiveDir, `${date}.tar.gz`);
    if (!fs.existsSync(srcDir)) continue;
    try {
      execSync(`tar -czf "${outFile}" -C "${config.dataDir}" "${date}"`, {
        stdio: "pipe",
      });
      fs.rmSync(srcDir, { recursive: true, force: true });
      archived.push(date);
      console.log(`[auto-archive] archived ${date}`);
    } catch (e) {
      console.warn(`[auto-archive] failed for ${date}:`, (e as Error).message);
    }
  }
  return { archived };
}
