// Product detail page — /product/[platform]/[id]
// Server component that finds the product across all dates and renders
// a full standalone detail view (shareable URL).

export const runtime = "edge";

import { notFound } from "next/navigation";
import Link from "next/link";
import { config } from "@/lib/affiliate/config";
import { listDates, readJson } from "@/lib/affiliate/data-writer";
import type { DailySummary, PickedProduct, Platform } from "@/lib/affiliate/types";
import { PLATFORM_LABELS, PLATFORM_COLORS, currencySymbol } from "@/lib/affiliate/types";
import { ArrowLeft, ExternalLink, Star, Users, Tag, Ticket, Store, Sparkles, Lightbulb, TrendingUp, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ platform: string; id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { platform, id } = await params;
  const product = await findProduct(platform as Platform, id);
  if (!product) return { title: "商品未找到" };
  return {
    title: `${product.title.slice(0, 40)} · 联盟 AI 选品`,
    description: product.aiCopy ?? product.reason,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { platform, id } = await params;
  const product = await findProduct(platform as Platform, id);
  if (!product) notFound();

  const platformColor = PLATFORM_COLORS[product.platform];
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href="/" className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">返回仪表盘</span>
          </Link>
          <div className="ml-auto text-xs text-muted-foreground">
            商品详情 · {PLATFORM_LABELS[product.platform]}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Image */}
          <Card className="relative aspect-square overflow-hidden bg-muted p-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Store className="h-16 w-16" />
              </div>
            )}
            <div
              className="absolute left-3 top-3 rounded-md px-2.5 py-1 text-sm font-semibold text-white shadow"
              style={{ backgroundColor: platformColor }}
            >
              {PLATFORM_LABELS[product.platform]}
            </div>
            {product.isVirtual && (
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-xs font-bold text-white shadow">
                <Cloud className="h-3 w-3" />
                虚拟商品
              </div>
            )}
          </Card>

          {/* Right: info */}
          <div className="flex flex-col gap-3">
            <h1 className="text-lg font-bold leading-snug text-foreground sm:text-xl">
              {product.title}
            </h1>

            {/* Score */}
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:from-amber-950/30 dark:to-orange-950/30">
              <div>
                <div className="text-xs text-muted-foreground">AI 综合评分</div>
                <div className="text-3xl font-bold text-amber-600">
                  {product.score.toFixed(1)}
                  <span className="text-base text-muted-foreground">/100</span>
                </div>
              </div>
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>

            {/* Price */}
            <div className="rounded-lg border p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-rose-600">{currencySymbol(product.platform)}{product.price.toFixed(2)}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {currencySymbol(product.platform)}{product.originalPrice.toFixed(2)}
                    </span>
                    <Badge variant="destructive">-{discount}%</Badge>
                  </>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                预期收益 {currencySymbol(product.platform)}{product.expectedRevenue.toFixed(2)}
                <span className="text-xs text-muted-foreground">(佣金 {product.commissionRate}%)</span>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <MetricBox icon={<Star className="h-4 w-4 text-amber-500" />} label="评分" value={product.rating ? product.rating.toFixed(1) : "-"} />
              <MetricBox icon={<Users className="h-4 w-4 text-cyan-500" />} label="销量" value={product.salesVolume ? product.salesVolume.toLocaleString() : "-"} />
              <MetricBox icon={<Tag className="h-4 w-4 text-teal-500" />} label="评价数" value={product.reviewCount ? product.reviewCount.toLocaleString() : "-"} />
              <MetricBox icon={<Ticket className="h-4 w-4 text-rose-500" />} label="优惠券" value={product.couponAmount ? `${currencySymbol(product.platform)}${product.couponAmount}` : "无"} />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Store className="h-3 w-3" />
              {product.shopName ?? "未知店铺"}
              <span>·</span>
              <span>{product.category}</span>
            </div>

            <a href={product.link} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <ExternalLink className="mr-1 h-4 w-4" />
              前往推广链接
            </a>
          </div>
        </div>

        {/* AI analysis */}
        <div className="mt-4 space-y-3">
          <Card className="bg-amber-50 p-4 dark:bg-amber-950/20">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
              AI 种草文案
            </div>
            <p className="text-sm leading-relaxed text-foreground">{product.aiCopy || "暂无文案"}</p>
          </Card>

          <Card className="bg-emerald-50 p-4 dark:bg-emerald-950/20">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <Lightbulb className="h-4 w-4" />
              推荐理由
            </div>
            <p className="text-sm leading-relaxed text-foreground">{product.reason || "暂无理由"}</p>
          </Card>

          {product.aiTags.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">AI 标签</div>
              <div className="flex flex-wrap gap-1.5">
                {product.aiTags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="mt-8 border-t bg-background/85 py-4 text-center text-xs text-muted-foreground">
        联盟 AI 选品中心 · 商品详情页
      </footer>
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      {icon}
      <div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

/** Find a product by platform + id across all dates. */
async function findProduct(platform: Platform, id: string): Promise<PickedProduct | null> {
  const dates = await listDates();
  for (const date of dates) {
    const summary = await readJson<DailySummary>(date, "summary.json");
    if (!summary?.topPicks) continue;
    const found = summary.topPicks.find((p) => p.platform === platform && p.id === id);
    if (found) return found;
  }
  return null;
}
