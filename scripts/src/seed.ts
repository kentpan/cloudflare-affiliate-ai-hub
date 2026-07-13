// Convenience seed entry point for the standalone scripts package.
// Usage: tsx src/seed.ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.DATA_DIR = process.env.DATA_DIR ?? path.resolve(__dirname, "..", "..", ".data");

const { seedIfEmpty } = await import("../../web/src/lib/affiliate/seed.js");

const res = await seedIfEmpty();
console.log("[scripts] seed result:", res);
process.exit(0);
