// GET /api/sankey?date=YYYY-MM-DD
// Returns Sankey diagram data: direction → platform flow with counts + revenue.
// Used to visualize how 选品方向 distribute across platforms.

import { NextResponse } from "next/server";
import { readJson, dataPath, listDates, ensureDataRoot } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct, Platform } from "@/lib/affiliate/types";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/affiliate/types";

export const dynamic = "force-dynamic";

interface SankeyNode {
  id: string;
  name: string;
  color?: string;
  type: "direction" | "platform";
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  revenue: number;
  avgScore: number;
}

export async function GET(request: Request) {
  ensureDataRoot();
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");
  if (!date) {
    const dates = listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }

  const summary = readJson<DailySummary>(dataPath(date, "summary.json"));
  if (!summary) {
    return NextResponse.json({ error: "not found", date }, { status: 404 });
  }

  const picks = summary.topPicks ?? [];
  const PLATFORM_COLORS: Record<Platform, string> = {
    amazon: "#ff9900",
    taobao: "#ff5000",
    jd: "#e1251b",
    google: "#4285f4",
  };

  // Build direction → platform flow
  const flow = new Map<string, { count: number; revenue: number; scoreSum: number }>();
  const directionSet = new Set<string>();
  const platformSet = new Set<Platform>();

  for (const p of picks) {
    const dir = p.directionId ?? "other";
    directionSet.add(dir);
    platformSet.add(p.platform);
    const key = `${dir}>${p.platform}`;
    const cur = flow.get(key) ?? { count: 0, revenue: 0, scoreSum: 0 };
    cur.count += 1;
    cur.revenue += p.expectedRevenue;
    cur.scoreSum += p.score;
    flow.set(key, cur);
  }

  // Direction color lookup from config
  let directionColors: Record<string, string> = {};
  let directionNames: Record<string, string> = {};
  try {
    const configRes = await import("@/lib/affiliate/customization");
    const config = configRes.readConfig();
    for (const d of config.directions) {
      directionColors[d.id] = d.color;
      directionNames[d.id] = `${d.icon} ${d.name}`;
    }
  } catch {
    /* ignore */
  }

  const nodes: SankeyNode[] = [];
  // Direction nodes (left)
  for (const dir of directionSet) {
    nodes.push({
      id: `dir-${dir}`,
      name: directionNames[dir] ?? dir,
      color: directionColors[dir] ?? "#94a3b8",
      type: "direction",
    });
  }
  // Platform nodes (right)
  for (const p of platformSet) {
    nodes.push({
      id: `plt-${p}`,
      name: PLATFORM_LABELS[p],
      color: PLATFORM_COLORS[p],
      type: "platform",
    });
  }

  const links: SankeyLink[] = [...flow.entries()].map(([key, v]) => {
    const [dir, plat] = key.split(">");
    return {
      source: `dir-${dir}`,
      target: `plt-${plat}`,
      value: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
      avgScore: Math.round((v.scoreSum / v.count) * 10) / 10,
    };
  });

  return NextResponse.json({
    date,
    nodes,
    links,
    totalProducts: picks.length,
    directionCount: directionSet.size,
    platformCount: platformSet.size,
  });
}
