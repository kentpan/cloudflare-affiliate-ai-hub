// Dimension aggregation logic (by platform / category / commission / price range).
// Pure functions, reused by both the generator and the API.

import type { PickedProduct, DimensionGroup } from "./types";

export function byPlatform(products: PickedProduct[]): DimensionGroup[] {
  return groupBy(products, (p) => p.platform);
}

export function byCategory(products: PickedProduct[]): DimensionGroup[] {
  return groupBy(products, (p) => p.category || "未分类");
}

export function byCommission(products: PickedProduct[]): DimensionGroup[] {
  return groupBy(products, (p) => {
    const r = p.commissionRate;
    if (r >= 20) return "20%+";
    if (r >= 10) return "10-20%";
    if (r >= 5) return "5-10%";
    return "0-5%";
  });
}

export function byPriceRange(products: PickedProduct[]): DimensionGroup[] {
  return groupBy(products, (p) => {
    const v = p.price;
    if (v >= 1000) return "1000+";
    if (v >= 200) return "200-1000";
    if (v >= 50) return "50-200";
    return "0-50";
  });
}

function groupBy(
  products: PickedProduct[],
  keyFn: (p: PickedProduct) => string,
): DimensionGroup[] {
  const m = new Map<string, PickedProduct[]>();
  for (const p of products) {
    const k = keyFn(p);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(p);
  }
  return [...m.entries()]
    .map(([key, items]) => ({
      key,
      count: items.length,
      avgScore: round2(items.reduce((s, x) => s + x.score, 0) / items.length),
      expectedRevenue: round2(
        items.reduce((s, x) => s + x.expectedRevenue, 0),
      ),
      items,
    }))
    .sort((a, b) => b.expectedRevenue - a.expectedRevenue);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
