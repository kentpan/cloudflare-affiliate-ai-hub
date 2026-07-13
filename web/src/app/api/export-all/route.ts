// GET /api/export-all?format=zip
// Exports ALL dates' top picks as a single ZIP archive containing one CSV
// per date + a combined summary CSV. Useful for offline analysis / backup.
//
// format=zip (default): .zip with {date}.csv per day + _summary.csv
// format=json: single JSON with all summaries

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "@/lib/affiliate/config";
import { readJson, dataPath, listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct } from "@/lib/affiliate/types";
import { PLATFORM_LABELS } from "@/lib/affiliate/types";
import os from "node:os";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "zip").toLowerCase();
  const dates = listDates(); // newest first

  if (dates.length === 0) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }

  // Gather all summaries
  const summaries: Array<{ date: string; summary: DailySummary | null }> = dates.map((d) => ({
    date: d,
    summary: readJson<DailySummary>(dataPath(d, "summary.json")),
  }));

  if (format === "json") {
    const all = summaries
      .filter((s) => s.summary)
      .map((s) => ({ date: s.date, ...s.summary }));
    return new NextResponse(JSON.stringify({ dates: all }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="affiliate-all-dates.json"`,
      },
    });
  }

  // format === "zip": build CSVs in a temp dir, then zip
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aff-export-"));
  try {
    // One CSV per date
    for (const { date, summary } of summaries) {
      if (!summary) continue;
      const picks = summary.topPicks ?? [];
      const csv = toCSV(picks, date);
      fs.writeFileSync(path.join(tmpDir, `${date}.csv`), "\uFEFF" + csv, "utf8");
    }
    // Combined summary CSV
    const sumRows = [
      ["日期", "商品总数", "平均评分", "预期总收益", "Amazon数", "淘宝数", "京东数", "Google数"],
      ...summaries
        .filter((s) => s.summary)
        .map((s) => {
          const sm = s.summary!;
          return [
            s.date,
            sm.totalCount ?? (sm.topPicks?.length ?? 0),
            sm.avgScore?.toFixed(2) ?? "0",
            sm.totalExpectedRevenue?.toFixed(2) ?? "0",
            sm.platforms?.amazon?.count ?? 0,
            sm.platforms?.taobao?.count ?? 0,
            sm.platforms?.jd?.count ?? 0,
            sm.platforms?.google?.count ?? 0,
          ];
        }),
    ];
    const sumCsv = sumRows
      .map((r) => r.map(csvCell).join(","))
      .join("\n");
    fs.writeFileSync(path.join(tmpDir, "_summary.csv"), "\uFEFF" + sumCsv, "utf8");

    // Zip the temp dir
    const outFile = path.join(tmpDir, "affiliate-all-dates.zip");
    // cd into tmpDir so the zip has flat structure
    execSync(`cd "${tmpDir}" && zip -q "${outFile}" *.csv`, { stdio: "pipe" });
    const buf = fs.readFileSync(outFile);

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="affiliate-all-dates.zip"`,
      },
    });
  } finally {
    // cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function toCSV(picks: PickedProduct[], date: string): string {
  const headers = [
    "日期",
    "排名",
    "平台",
    "标题",
    "类目",
    "价格",
    "佣金率(%)",
    "预期收益",
    "评分",
    "虚拟商品",
    "选品方向",
    "AI文案",
    "AI标签",
    "推荐理由",
  ];
  const rows = picks.map((p, i) => [
    date,
    i + 1,
    PLATFORM_LABELS[p.platform],
    p.title,
    p.category,
    p.price,
    p.commissionRate,
    p.expectedRevenue,
    p.score,
    p.isVirtual ? "是" : "否",
    p.directionId ?? "",
    (p.aiCopy ?? "").replace(/[\r\n]/g, " "),
    (p.aiTags ?? []).join("/"),
    (p.reason ?? "").replace(/[\r\n]/g, " "),
  ]);
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
