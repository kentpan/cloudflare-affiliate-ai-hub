// One-shot seed script — generates 3 days of historical pick data using
// the heuristic fallback (no LLM). Run from the monorepo root with:
//   bun run affiliate-ai-hub/web/seed.ts
// or from web/ with: bun run seed.ts
import { seedIfEmpty } from "./src/lib/affiliate/seed";

const res = await seedIfEmpty();
console.log("Seed result:", res);
process.exit(0);
