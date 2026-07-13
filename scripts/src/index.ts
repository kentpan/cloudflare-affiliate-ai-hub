// Standalone picker entry point — runs the full AI selection pipeline and
// writes results to ../.data/ (the monorepo root .data/ directory).
//
// Designed to run in GitHub Actions (see .github/workflows/daily-picker.yml)
// independently of the web app. It reuses the shared affiliate library that
// lives in ../web/src/lib/affiliate/ to avoid logic duplication.
//
// Usage:  tsx src/index.ts [--date YYYY-MM-DD] [--no-llm] [seed]
//
// LLM concurrency-limit retry policy: when the model returns
// "model glm-5.2 concurrency limit exceeded", the llm-client waits 3s and
// retries up to 10 times (configured in web/src/lib/affiliate/config.ts).

import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve .data/ at the monorepo root (affiliate-ai-hub/.data/).
// This file is at affiliate-ai-hub/scripts/src/index.ts, so ../.data
// resolves to affiliate-ai-hub/.data/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.DATA_DIR = process.env.DATA_DIR ?? path.resolve(__dirname, "..", "..", ".data");

// Reuse the shared affiliate library from the app root (src/lib/affiliate/).
const { generateDaily, ensureDataRoot, todayStr } = await import(
  "../../src/lib/affiliate/generator.js"
);
const { seedIfEmpty } = await import("../../src/lib/affiliate/seed.js");

// Parse CLI args
const args = process.argv.slice(2);
const dateArgIdx = args.indexOf("--date");
const date = dateArgIdx >= 0 ? args[dateArgIdx + 1] : undefined;
const useLlm = !args.includes("--no-llm");
const action = args.find((a) => !a.startsWith("--") && a !== date);

async function main() {
  ensureDataRoot();
  if (action === "seed") {
    const res = await seedIfEmpty();
    console.log("[scripts] seed result:", res);
    return;
  }
  const target = date ?? todayStr();
  console.log(`[scripts] generating picks for ${target} (useLlm=${useLlm})...`);
  const res = await generateDaily({
    date: target,
    source: "scheduled",
    useLlm,
  });
  console.log("[scripts] done:", {
    date: res.date,
    total: res.total,
    durationMs: res.durationMs,
    llmUsed: res.llmUsed,
    totals: res.totals,
  });
}

main().catch((e) => {
  console.error("[scripts] fatal:", e);
  process.exit(1);
});
