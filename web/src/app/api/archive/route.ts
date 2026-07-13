// GET /api/archive?action=run  — archive .data entries older than 60 days
// GET /api/archive?action=list — list archived snapshots
// GET /api/archive?action=restore&date=YYYY-MM-DD — restore an archived date
//
// Archives are stored as .data/_archive/{date}.tar.gz to keep the active
// .data/ directory lean. The active listDates() skips the _archive dir.

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "@/lib/affiliate/config";
import { ensureDataRoot, listDates, readJson, dataPath } from "@/lib/affiliate/data-writer";
import type { DataIndex } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

const ARCHIVE_DIR = path.join(config.dataDir, "_archive");
const ARCHIVE_THRESHOLD_DAYS = 60;

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "list";
  const date = searchParams.get("date");

  if (action === "list") {
    return NextResponse.json({ archives: listArchives() });
  }

  if (action === "restore" && date) {
    return restoreArchive(date);
  }

  if (action === "run") {
    return runArchive();
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

function listArchives(): Array<{ date: string; size: number; archivedAt: string }> {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];
  return fs
    .readdirSync(ARCHIVE_DIR)
    .filter((f) => f.endsWith(".tar.gz"))
    .map((f) => {
      const fp = path.join(ARCHIVE_DIR, f);
      const stat = fs.statSync(fp);
      return {
        date: f.replace(/\.tar\.gz$/, ""),
        size: stat.size,
        archivedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function runArchive() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const dates = listDates(); // active dates, newest first
  const now = Date.now();
  const thresholdMs = ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const toArchive = dates.filter((d) => {
    const dt = new Date(d).getTime();
    return now - dt > thresholdMs;
  });

  const archived: string[] = [];
  for (const date of toArchive) {
    const srcDir = path.join(config.dataDir, date);
    const outFile = path.join(ARCHIVE_DIR, `${date}.tar.gz`);
    if (!fs.existsSync(srcDir)) continue;
    // Use tar via child_process (available in Node sandbox)
    try {
      
      execSync(`tar -czf "${outFile}" -C "${config.dataDir}" "${date}"`, {
        stdio: "pipe",
      });
      // Remove the active directory after archiving
      fs.rmSync(srcDir, { recursive: true, force: true });
      archived.push(date);
    } catch (e) {
      console.error(`[archive] failed for ${date}:`, (e as Error).message);
    }
  }

  // Update index.json to remove archived dates
  const indexPath = dataPath("index.json");
  const index = readJson<DataIndex>(indexPath);
  if (index) {
    index.dates = listDates();
    index.updatedAt = new Date().toISOString();
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  return NextResponse.json({
    ok: true,
    archived,
    count: archived.length,
    thresholdDays: ARCHIVE_THRESHOLD_DAYS,
    archives: listArchives(),
  });
}

function restoreArchive(date: string) {
  const archiveFile = path.join(ARCHIVE_DIR, `${date}.tar.gz`);
  if (!fs.existsSync(archiveFile)) {
    return NextResponse.json({ error: "archive not found", date }, { status: 404 });
  }
  try {
    
    execSync(`tar -xzf "${archiveFile}" -C "${config.dataDir}"`, { stdio: "pipe" });
    // Remove from archive
    fs.unlinkSync(archiveFile);
    // Update index
    const indexPath = dataPath("index.json");
    const index = readJson<DataIndex>(indexPath);
    if (index) {
      index.dates = listDates();
      index.updatedAt = new Date().toISOString();
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
    }
    return NextResponse.json({ ok: true, date, restored: true });
  } catch (e) {
    return NextResponse.json(
      { error: "restore failed", detail: (e as Error).message },
      { status: 500 },
    );
  }
}
