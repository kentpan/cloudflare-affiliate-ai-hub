"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Trophy,
  Sparkles,
  ExternalLink,
  Cloud,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  currencySymbol,
  type PickedProduct,
} from "@/lib/affiliate/types";
import type { ProductComparison } from "@/lib/affiliate/comparison";
import { cn } from "@/lib/utils";

interface TrendingProductCardProps {
  product: PickedProduct;
  rank?: number;
  comparison?: ProductComparison;
  directionColor?: string;
  onSelect?: (p: PickedProduct) => void;
}

export function TrendingProductCard({
  product,
  rank,
  comparison,
  directionColor,
  onSelect,
}: TrendingProductCardProps) {
  const platformColor = PLATFORM_COLORS[product.platform];
  const scoreDelta = comparison?.scoreDelta ?? null;
  const isNew = comparison?.isNew ?? false;
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100,
        )
      : 0;

  return (
    <Card
      className={cn(
        "group relative flex gap-3 overflow-hidden p-3 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer",
        "border-border/60 hover:border-primary/40",
        // Virtual goods get a subtle teal tint + border to distinguish them
        product.isVirtual &&
          "bg-teal-50/40 dark:bg-teal-950/10 border-teal-200/60 hover:border-teal-400/60",
      )}
      onClick={() => onSelect?.(product)}
    >
      {/* Direction color strip */}
      {directionColor && (
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: directionColor }}
        />
      )}

      {/* Rank badge */}
      {rank !== undefined && rank < 10 && (
        <div
          className={cn(
            "z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
            rank === 0 && "bg-amber-100 text-amber-700 dark:bg-amber-950/40",
            rank === 1 && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            rank === 2 && "bg-orange-100 text-orange-700 dark:bg-orange-950/40",
            rank >= 3 && "bg-muted text-muted-foreground",
          )}
        >
          {rank < 3 ? <Trophy className="h-4 w-4" /> : rank + 1}
        </div>
      )}

      {/* Image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : null}
        <div
          className="absolute bottom-0 left-0 px-1 py-0.5 text-[9px] font-semibold text-white"
          style={{ backgroundColor: platformColor }}
        >
          {PLATFORM_LABELS[product.platform]}
        </div>
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary hover:underline"
            title={product.title}
          >
            <Link
              href={`/product/${product.platform}/${product.id}`}
              onClick={(e) => e.stopPropagation()}
              prefetch={false}
              className="after:absolute after:inset-0"
              aria-label={product.title}
            >
              {product.title}
            </Link>
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <div className="flex items-center gap-0.5 text-sm font-bold text-amber-600">
              <Star className="h-3 w-3 fill-current" />
              {product.score.toFixed(1)}
            </div>
            <GrowthIndicator delta={scoreDelta} isNew={isNew} />
          </div>
        </div>

        {/* AI copy */}
        {product.aiCopy && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            <Sparkles className="mr-0.5 inline h-2.5 w-2.5 text-amber-500" />
            {product.aiCopy}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {product.isVirtual && (
            <Badge
              className="gap-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 px-1 py-0 text-[9px] font-bold text-white"
            >
              <Cloud className="h-2 w-2" />
              虚拟
            </Badge>
          )}
          {product.aiTags.slice(0, 2).map((tag, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="px-1 py-0 text-[9px] font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Price + revenue + score bar */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-rose-600">
                {currencySymbol(product.platform)}{product.price.toFixed(0)}
              </span>
              {discount > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                  -{discount}%
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-emerald-600">
              收益 {currencySymbol(product.platform)}{product.expectedRevenue.toFixed(1)} · {product.commissionRate}%
            </div>
          </div>
          <div className="flex w-16 flex-col items-end gap-0.5">
            <Progress value={product.score} className="h-1" />
            <span className="text-[9px] text-muted-foreground">评分</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function GrowthIndicator({
  delta,
  isNew,
}: {
  delta: number | null;
  isNew: boolean;
}) {
  if (isNew) {
    return (
      <span className="rounded bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        NEW
      </span>
    );
  }
  if (delta === null || delta === 0) {
    return (
      <span className="flex items-center text-[9px] text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
        0
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="flex items-center text-[9px] font-bold text-emerald-600">
        <TrendingUp className="h-2.5 w-2.5" />+{delta.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center text-[9px] font-bold text-rose-500">
      <TrendingDown className="h-2.5 w-2.5" />
      {delta.toFixed(1)}
    </span>
  );
}
