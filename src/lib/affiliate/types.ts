// Core domain types for the Affiliate AI Auto-Selection & Distribution system.
// Adapted from the uploaded plan to fit the Next.js 16 + TypeScript stack.

export type Platform = "amazon" | "taobao" | "jd" | "google";

export const PLATFORMS: Platform[] = ["amazon", "taobao", "jd", "google"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  amazon: "Amazon",
  taobao: "淘宝客",
  jd: "京东",
  google: "Google",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  amazon: "#ff9900",
  taobao: "#ff5000",
  jd: "#e1251b",
  google: "#4285f4",
};

// Currency symbol per platform.
// Amazon & Google are international platforms priced in USD ($).
// 淘宝客 & 京东 are Chinese platforms priced in CNY (¥).
export const PLATFORM_CURRENCY: Record<Platform, string> = {
  amazon: "$",
  taobao: "¥",
  jd: "¥",
  google: "$",
};

/**
 * Format a monetary amount with the platform's currency symbol.
 * Usage: `{formatPrice(product.price, product.platform)}`
 */
export function formatPrice(amount: number, platform: Platform): string {
  const symbol = PLATFORM_CURRENCY[platform] ?? "¥";
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Format revenue (commission * price) — inherits the platform's currency.
 */
export function formatRevenue(amount: number, platform: Platform): string {
  const symbol = PLATFORM_CURRENCY[platform] ?? "¥";
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get the currency symbol for a platform (for inline JSX usage).
 */
export function currencySymbol(platform: Platform): string {
  return PLATFORM_CURRENCY[platform] ?? "¥";
}

export interface RawProduct {
  id: string;
  platform: Platform;
  title: string;
  price: number;
  originalPrice?: number;
  commissionRate: number; // percentage, e.g. 15 means 15%
  salesVolume?: number;
  rating?: number;
  reviewCount?: number;
  category: string;
  imageUrl?: string;
  link: string;
  couponAmount?: number;
  shopName?: string;
  directionId?: string; // matched 选品方向 id (customization)
  isVirtual?: boolean; // true for 软件/SaaS/会员点卡/课程/数字内容
  deliveryType?: "digital" | "physical";
  meta?: Record<string, unknown>;
}

export interface PickedProduct extends RawProduct {
  score: number; // 0-100
  expectedRevenue: number; // price * commissionRate / 100
  aiCopy: string; // AI-generated marketing copy
  aiTags: string[]; // AI tags
  reason: string; // AI recommendation reason
}

export interface PlatformStat {
  count: number;
  avgCommission: number;
  topCategory: string;
  avgScore: number;
  totalExpectedRevenue: number;
}

export interface DailySummary {
  date: string;
  generatedAt: string;
  platforms: Record<Platform, PlatformStat>;
  topPicks: PickedProduct[];
  totalCount: number;
  avgScore: number;
  totalExpectedRevenue: number;
}

export interface DimensionGroup {
  key: string;
  count: number;
  avgScore: number;
  expectedRevenue: number;
  items: PickedProduct[];
}

export type DimensionName =
  | "by-platform"
  | "by-category"
  | "by-commission"
  | "by-price-range";

export interface DimensionFile {
  dimension: string;
  groups: DimensionGroup[];
}

export interface DataIndex {
  updatedAt: string;
  dates: string[];
  platforms: Platform[];
  totals: Record<
    string,
    { amazon: number; taobao: number; jd: number; google: number; total: number }
  >;
}

export interface GenerationLogEntry {
  timestamp: string;
  date: string;
  platforms: Record<Platform, { raw: number; picked: number }>;
  total: number;
  durationMs: number;
  source: "manual" | "scheduled" | "seed";
  llmUsed: boolean;
}

export interface WordFreq {
  text: string;
  value: number;
  avgScore: number;
  virtualCount: number;
}

export interface SearchHit {
  date: string;
  product: PickedProduct;
  matchedFields: string[];
  snippet: string;
}
