"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Sparkles,
  TrendingUp,
  Star,
  Users,
  Ticket,
  Tag,
  Store,
  Lightbulb,
} from "lucide-react";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  type PickedProduct,
} from "@/lib/affiliate/types";

interface ProductDetailDialogProps {
  product: PickedProduct | null;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({
  product,
  onOpenChange,
}: ProductDetailDialogProps) {
  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {product && <DetailBody product={product} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({ product }: { product: PickedProduct }) {
  const platformColor = PLATFORM_COLORS[product.platform];
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100,
        )
      : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-8 text-lg leading-snug">
          {product.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          商品详情与 AI 分析
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Store className="h-16 w-16" />
            </div>
          )}
          <div
            className="absolute left-3 top-3 rounded-md px-2.5 py-1 text-sm font-semibold text-white shadow"
            style={{ backgroundColor: platformColor }}
          >
            {PLATFORM_LABELS[product.platform]}
          </div>
        </div>

        {/* Right: metrics */}
        <div className="flex flex-col gap-3">
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

          {/* Price block */}
          <div className="rounded-lg border p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-rose-600">
                ¥{product.price.toFixed(2)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    ¥{product.originalPrice.toFixed(2)}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    -{discount}%
                  </Badge>
                </>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              预期收益 ¥{product.expectedRevenue.toFixed(2)}
              <span className="text-xs text-muted-foreground">
                (佣金 {product.commissionRate}%)
              </span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <MetricBox
              icon={<Star className="h-4 w-4 text-amber-500" />}
              label="评分"
              value={product.rating ? product.rating.toFixed(1) : "-"}
            />
            <MetricBox
              icon={<Users className="h-4 w-4 text-cyan-500" />}
              label="销量"
              value={product.salesVolume ? product.salesVolume.toLocaleString() : "-"}
            />
            <MetricBox
              icon={<Tag className="h-4 w-4 text-teal-500" />}
              label="评价数"
              value={product.reviewCount ? product.reviewCount.toLocaleString() : "-"}
            />
            <MetricBox
              icon={<Ticket className="h-4 w-4 text-rose-500" />}
              label="优惠券"
              value={product.couponAmount ? `¥${product.couponAmount}` : "无"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Store className="h-3 w-3" />
            {product.shopName ?? "未知店铺"}
            <span>·</span>
            <span>{product.category}</span>
          </div>

          <Button
            className="w-full"
            onClick={() =>
              window.open(product.link, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            前往推广链接
          </Button>
        </div>
      </div>

      <Separator />

      {/* AI analysis */}
      <div className="space-y-3">
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
            AI 种草文案
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {product.aiCopy || "暂无文案"}
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Lightbulb className="h-4 w-4" />
            推荐理由
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {product.reason || "暂无理由"}
          </p>
        </div>

        {product.aiTags.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              AI 标签
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.aiTags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MetricBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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
