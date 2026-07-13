// Customization module — user-defined 选品方向 (selection directions) and
// 关键词 (keywords) that drive product selection across all platform
// adapters. Persisted to .data/config.json.
//
// A "direction" is a niche/category preset (e.g. "智能家居", "户外露营")
// with a list of keywords. When the generator runs, each adapter receives
// the active directions+keywords and uses them to scope its product search
// (real adapters use them as search keywords; mock adapters filter/expand
// the catalog to match).

import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { ensureDataRoot, readJson, writeJson, dataPath } from "./data-writer";

export interface Direction {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  icon: string; // emoji or lucide icon name
  enabled: boolean;
}

export interface CustomizationConfig {
  version: number;
  updatedAt: string;
  directions: Direction[];
  globalKeywords: string[];
  // Per-platform keyword overrides (optional). If empty, globalKeywords +
  // direction.keywords are used for all platforms.
  platformKeywords: Partial<Record<string, string[]>>;
}

export const DEFAULT_DIRECTIONS: Direction[] = [
  // ===== 虚拟商品方向（软件/SaaS/会员点卡优先）=====
  {
    id: "software-tools",
    name: "软件工具",
    keywords: ["办公软件", "设计软件", "开发工具", "PDF编辑器", "杀毒软件", "压缩工具", "CAD软件", "思维导图"],
    color: "#0d9488",
    icon: "💻",
    enabled: true,
  },
  {
    id: "saas-services",
    name: "SaaS 服务",
    keywords: ["云存储", "在线办公", "CRM系统", "邮箱服务", "网站搭建", "在线客服", "项目管理", "协同办公", "Notion", "Figma"],
    color: "#0ea5e9",
    icon: "☁️",
    enabled: true,
  },
  {
    id: "membership-cards",
    name: "会员点卡",
    keywords: ["视频会员", "音乐会员", "购物会员", "读书会员", "网盘会员", "健身会员", "京东PLUS", "88VIP", "网易云音乐会员", "腾讯视频会员", "爱奇艺会员"],
    color: "#f59e0b",
    icon: "🎫",
    enabled: true,
  },
  {
    id: "points-cards",
    name: "点卡充值",
    keywords: ["话费充值", "流量包", "游戏点卡", "Q币", "Steam充值", "AppStore充值", "京东E卡", "天猫超市卡", "加油卡"],
    color: "#ec4899",
    icon: "💳",
    enabled: true,
  },
  {
    id: "online-courses",
    name: "在线课程",
    keywords: ["编程课程", "设计课程", "语言学习", "考证培训", "职业技能", "考研课程", "公考课程", "Excel课程", "Python课程"],
    color: "#14b8a6",
    icon: "📚",
    enabled: true,
  },
  {
    id: "digital-content",
    name: "数字内容",
    keywords: ["电子书", "有声书", "小说", "壁纸", "字体", "音效素材", "PPT模板", "视频素材", "摄影图库"],
    color: "#0891b2",
    icon: "📖",
    enabled: true,
  },
  // ===== 实体商品方向 =====
  {
    id: "smart-home",
    name: "智能家居",
    keywords: ["智能音箱", "扫地机器人", "智能门锁", "空气净化器", "智能灯具"],
    color: "#10b981",
    icon: "🏠",
    enabled: true,
  },
  {
    id: "outdoor-camping",
    name: "户外露营",
    keywords: ["露营帐篷", "户外电源", "登山杖", "便携桌椅", "睡袋"],
    color: "#f97316",
    icon: "⛺",
    enabled: true,
  },
  {
    id: "digital-electronics",
    name: "数码电子",
    keywords: ["蓝牙耳机", "智能手表", "机械键盘", "投影仪", "移动电源"],
    color: "#3b82f6",
    icon: "🎧",
    enabled: true,
  },
  {
    id: "beauty-care",
    name: "美妆个护",
    keywords: ["精华液", "洁面乳", "电动牙刷", "面膜", "护发"],
    color: "#ec4899",
    icon: "💄",
    enabled: true,
  },
  {
    id: "kitchen-appliances",
    name: "厨房小电",
    keywords: ["空气炸锅", "破壁机", "榨汁机", "电烤箱", "咖啡机"],
    color: "#ef4444",
    icon: "🍳",
    enabled: true,
  },
  {
    id: "mother-baby",
    name: "母婴玩具",
    keywords: ["纸尿裤", "积木玩具", "学习桌椅", "婴儿推车", "绘本"],
    color: "#06b6d4",
    icon: "🧸",
    enabled: true,
  },
  {
    id: "sports-fitness",
    name: "运动健身",
    keywords: ["瑜伽垫", "哑铃", "跑步鞋", "筋膜枪", "跳绳"],
    color: "#06b6d4",
    icon: "🏃",
    enabled: true,
  },
  {
    id: "food-health",
    name: "食品保健",
    keywords: ["坚果零食", "挂耳咖啡", "益生菌", "代餐", "蜂蜜"],
    color: "#84cc16",
    icon: "☕",
    enabled: true,
  },
];

export const DEFAULT_CONFIG: CustomizationConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  directions: DEFAULT_DIRECTIONS,
  globalKeywords: [],
  platformKeywords: {},
};

export function getConfigPath(): string {
  return dataPath("config.json");
}

export function readConfig(): CustomizationConfig {
  ensureDataRoot();
  const c = readJson<CustomizationConfig>(getConfigPath());
  if (!c || !Array.isArray(c.directions)) {
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  return c;
}

export function writeConfig(c: CustomizationConfig): void {
  ensureDataRoot();
  const normalized: CustomizationConfig = {
    ...c,
    version: 1,
    updatedAt: new Date().toISOString(),
    directions: (c.directions ?? []).map((d) => ({
      ...d,
      keywords: Array.isArray(d.keywords) ? d.keywords : [],
      enabled: d.enabled ?? true,
    })),
    globalKeywords: Array.isArray(c.globalKeywords) ? c.globalKeywords : [],
    platformKeywords: c.platformKeywords ?? {},
  };
  writeJson(getConfigPath(), normalized);
}

/** Returns the list of enabled directions (preserves order). */
export function getEnabledDirections(): Direction[] {
  return readConfig().directions.filter((d) => d.enabled);
}

/** Returns all keywords from enabled directions + global keywords, deduped. */
export function getAllActiveKeywords(): string[] {
  const c = readConfig();
  const set = new Set<string>(c.globalKeywords);
  for (const d of c.directions) {
    if (d.enabled) for (const k of d.keywords) set.add(k);
  }
  return [...set];
}

/**
 * Map a product (by title/category) to the best-matching enabled direction.
 * Returns the direction id, or null if no match.
 */
export function matchDirection(
  product: { title: string; category: string },
  directions: Direction[] = getEnabledDirections(),
): Direction | null {
  const haystack = `${product.title} ${product.category}`.toLowerCase();
  let best: { dir: Direction; score: number } | null = null;
  for (const d of directions) {
    let score = 0;
    for (const kw of d.keywords) {
      if (haystack.includes(kw.toLowerCase())) score += 1;
    }
    // Also match direction name
    if (haystack.includes(d.name.toLowerCase())) score += 2;
    if (score > 0 && (!best || score > best.score)) {
      best = { dir: d, score };
    }
  }
  return best?.dir ?? null;
}
