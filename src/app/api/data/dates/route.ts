// GET /api/data/dates — list of available dates (newest first).
// Node.js runtime: 扫描本地 .data/ 目录获取所有日期，同时合并远程 index.json 数据
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";
import { fetchIndex } from "@/lib/affiliate/data-writer";

export async function GET() {
  const idx = await fetchIndex();
  const remoteDates = idx?.dates ?? [];

  // 扫描本地 .data/ 目录获取所有日期文件夹
  const localDates: string[] = [];
  try {
    const dataDir = join(process.cwd(), ".data");
    const entries = await readdir(dataDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
        localDates.push(entry.name);
      }
    }
  } catch {
    // 远程环境无本地 .data/，忽略
  }

  const merged = new Set([...localDates, ...remoteDates]);
  return NextResponse.json({ dates: Array.from(merged).sort().reverse() });
}
