"use client";

import Image from "next/image";
import {
  Star,
  TrendingUp,
  Ticket,
  ExternalLink,
  Sparkles,
  Store,
  Flame,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  type PickedProduct,
} from "@/lib/affiliate/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: PickedProduct;
  rank?: number;
  onSelect?: (p: PickedProduct) => void;
}

export function ProductCard({ product, rank, onSelect }: ProductCardProps) {
  const platformColor = PLATFORM_COLORS[product.platform];
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100,
        )
      : 0;

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden p-0 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl cursor-pointer",
        "border-border/60 hover:border-primary/40",
      )}
      onClick={() => onSelect?.(product)}
    >
      {/* Rank ribbon */}
      {rank !== undefined && rank < 3 && (
        <div
          className={cn(
            "absolute left-0 top-0 z-20 flex h-8 w-8 items-center justify-center rounded-br-xl text-sm font-bold text-white shadow-md",
            rank === 0 && "bg-amber-500",
            rank === 1 && "bg-slate-400",
            rank === 2 && "bg-orange-700",
          )}
        >
          {rank + 1}
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Store className="h-10 w-10" />
          </div>
        )}

        {/* Platform badge */}
        <div
          className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
          style={{ backgroundColor: platformColor }}
        >
          {PLATFORM_LABELS[product.platform]}
        </div>

        {/* Score badge */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-sm">
          <Flame className="h-3 w-3" />
          {product.score.toFixed(1)}
        </div>

        {/* Discount tag */}
        {discount > 0 && (
          <div className="absolute bottom-2 left-2 rounded bg-rose-500 px-1.5 py-0.5 text-xs font-bold text-white shadow">
            -{discount}%
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Title */}
        <h3
          className="line-clamp-2 text-sm font-semibold leading-snug text-foreground"
          title={product.title}
        >
          {product.title}
        </h3>

        {/* AI copy */}
        {product.aiCopy && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-amber-500" />
            {product.aiCopy}
          </p>
        )}

        {/* Tags */}
        {product.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.aiTags.slice(0, 3).map((tag, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
          <Metric
            icon={<TrendingUp className="h-3 w-3" />}
            label="佣金"
            value={`${product.commissionRate}%`}
            tone="emerald"
          />
          <Metric
            icon={<Star className="h-3 w-3" />}
            label="评分"
            value={product.rating ? product.rating.toFixed(1) : "-"}
            tone="amber"
          />
          <Metric
            icon={<Ticket className="h-3 w-3" />}
            label="券"
            value={product.couponAmount ? `¥${product.couponAmount}` : "-"}
            tone="rose"
          />
        </div>

        {/* Price + expected revenue */}
        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-rose-600">
                ¥{product.price.toFixed(0)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ¥{product.originalPrice.toFixed(0)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-600">
              预期收益 ¥{product.expectedRevenue.toFixed(2)}
            </div>
          </div>
          <Button
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              window.open(product.link, "_blank", "noopener,noreferrer");
            }}
          >
            去推广
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* Score progress bar */}
        <div className="pt-1">
          <Progress value={product.score} className="h-1" />
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass = {
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
  }[tone];
  return (
    <div className={cn("rounded px-1 py-1", toneClass)}>
      <div className="flex items-center justify-center gap-0.5 text-muted-foreground">
        {icon}
        <span className="text-[9px]">{label}</span>
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
