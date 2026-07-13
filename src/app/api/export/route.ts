// GET /api/export?date=YYYY-MM-DD&format=csv|json|md

export const runtime = "edge";

// Exports the day's top picks in the requested format.

import { NextResponse } from "next/server";
import { readJson, listDates } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct, PLATFORM_LABELS } from "@/lib/affiliate/types";
import { PLATFORM_LABELS as PL, currencySymbol } from "@/lib/affiliate/types";


export async function GET(request: Request) {
  
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date");
  const format = (searchParams.get("format") ?? "csv").toLowerCase();

  if (!date) {
    const dates = await listDates();
    date = dates[0];
  }
  if (!date) {
    return NextResponse.json({ error: "no data" }, { status: 404 });
  }

  const summary = await await readJson<DailySummary>(date, "summary.json");
  if (!summary) {
    return NextResponse.json({ error: "not found", date }, { status: 404 });
  }

  const picks = summary.topPicks ?? [];
  const safeDate = date.replace(/-/g, "");

  if (format === "json") {
    return new NextResponse(JSON.stringify(summary, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="affiliate-picks-${safeDate}.json"`,
      },
    });
  }

  if (format === "md") {
    const md = toMarkdown(date, summary, picks);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="affiliate-picks-${safeDate}.md"`,
      },
    });
  }

  // default: csv
  const csv = toCSV(picks);
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="affiliate-picks-${safeDate}.csv"`,
    },
  });
}

function toCSV(picks: PickedProduct[]): string {
  const headers = [
    "排名",
    "平台",
    "标题",
    "类目",
    "价格",
    "原价",
    "佣金率(%)",
    "预期收益",
    "评分",
    "销量",
    "评分值",
    "评价数",
    "优惠券",
    "店铺",
    "虚拟商品",
    "选品方向",
    "AI文案",
    "AI标签",
    "推荐理由",
    "链接",
  ];
  const rows = picks.map((p, i) => [
    i + 1,
    PL[p.platform],
    p.title,
    p.category,
    p.price,
    p.originalPrice ?? "",
    p.commissionRate,
    p.expectedRevenue,
    p.score,
    p.salesVolume ?? "",
    p.rating ?? "",
    p.reviewCount ?? "",
    p.couponAmount ?? "",
    p.shopName ?? "",
    p.isVirtual ? "是" : "否",
    p.directionId ?? "",
    (p.aiCopy ?? "").replace(/[\r\n]/g, " "),
    (p.aiTags ?? []).join("/"),
    (p.reason ?? "").replace(/[\r\n]/g, " "),
    p.link,
  ]);
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toMarkdown(
  date: string,
  summary: DailySummary,
  picks: PickedProduct[],
): string {
  const lines: string[] = [];
  lines.push(`# 联盟 AI 选品 · ${date}`);
  lines.push("");
  lines.push(`> 生成时间：${new Date(summary.generatedAt).toLocaleString("zh-CN")}`);
  lines.push(`> 商品总数：${summary.totalCount} ｜ 平均评分：${summary.avgScore?.toFixed(1)} ｜ 预期总收益：多币种总计`);
  lines.push("");

  // Platform summary
  lines.push("## 平台概览");
  lines.push("");
  lines.push("| 平台 | 商品数 | 平均佣金 | 平均评分 | 预期收益 | 热门类目 |");
  lines.push("|------|--------|----------|----------|----------|----------|");
  for (const [p, stat] of Object.entries(summary.platforms)) {
    if (stat.count === 0) continue;
    lines.push(
      `| ${PL[p as keyof typeof PL]} | ${stat.count} | ${stat.avgCommission}% | ${stat.avgScore?.toFixed(1)} | 多币种 | ${stat.topCategory} |`,
    );
  }
  lines.push("");

  // Top picks
  lines.push("## 精选商品");
  lines.push("");
  let rank = 1;
  for (const p of picks) {
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `**${rank}**`;
    lines.push(`### ${medal} ${p.title}`);
    lines.push("");
    lines.push(`- **平台**：${PL[p.platform]}`);
    lines.push(`- **价格**：${currencySymbol(p.platform)}${p.price.toFixed(2)}${p.originalPrice ? `（原价 ${currencySymbol(p.platform)}${p.originalPrice.toFixed(2)}）` : ""}`);
    lines.push(`- **佣金率**：${p.commissionRate}% ｜ **预期收益**：${currencySymbol(p.platform)}${p.expectedRevenue.toFixed(2)}`);
    lines.push(`- **AI 评分**：${p.score.toFixed(1)} / 100`);
    if (p.salesVolume) lines.push(`- **销量**：${p.salesVolume.toLocaleString()}`);
    if (p.rating) lines.push(`- **评分**：${p.rating.toFixed(1)}（${p.reviewCount ?? 0} 评价）`);
    if (p.couponAmount) lines.push(`- **优惠券**：${currencySymbol(p.platform)}${p.couponAmount}`);
    if (p.isVirtual) lines.push(`- **类型**：🎁 虚拟商品（数字交付）`);
    if (p.aiCopy) lines.push(`- **AI 文案**：${p.aiCopy}`);
    if (p.aiTags?.length) lines.push(`- **标签**：${p.aiTags.join("、")}`);
    if (p.reason) lines.push(`- **推荐理由**：${p.reason}`);
    lines.push(`- **链接**：${p.link}`);
    lines.push("");
    rank++;
  }

  lines.push("---");
  lines.push("");
  lines.push("*由 联盟 AI 选品中心 自动生成*");
  return lines.join("\n");
}
