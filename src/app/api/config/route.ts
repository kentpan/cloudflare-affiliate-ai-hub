// GET  /api/config — read customization config (directions + keywords)
export const runtime = "edge";

import { NextResponse } from "next/server";
import { readJson } from "@/lib/affiliate/data-writer";
import type { CustomizationConfig } from "@/lib/affiliate/types";

// Fallback default config (used when config.json is not found)
const DEFAULT_CONFIG: CustomizationConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  directions: [
    { id: "software-tools", name: "软件工具", keywords: ["办公软件","设计软件","开发工具"], color: "#0d9488", icon: "💻", enabled: true },
    { id: "saas-services", name: "SaaS 服务", keywords: ["云存储","在线办公","CRM"], color: "#0ea5e9", icon: "☁️", enabled: true },
    { id: "membership-cards", name: "会员点卡", keywords: ["视频会员","音乐会员","购物会员"], color: "#f59e0b", icon: "🎫", enabled: true },
    { id: "points-cards", name: "点卡充值", keywords: ["话费充值","流量包","游戏点卡"], color: "#ec4899", icon: "💳", enabled: true },
    { id: "online-courses", name: "在线课程", keywords: ["编程课程","设计课程","语言学习"], color: "#14b8a6", icon: "📚", enabled: true },
    { id: "digital-content", name: "数字内容", keywords: ["电子书","有声书","小说"], color: "#0891b2", icon: "📖", enabled: true },
    { id: "smart-home", name: "智能家居", keywords: ["智能音箱","扫地机器人","智能门锁"], color: "#10b981", icon: "🏠", enabled: true },
    { id: "outdoor-camping", name: "户外露营", keywords: ["露营帐篷","户外电源","登山杖"], color: "#f97316", icon: "⛺", enabled: true },
    { id: "digital-electronics", name: "数码电子", keywords: ["蓝牙耳机","智能手表","机械键盘"], color: "#3b82f6", icon: "🎧", enabled: true },
    { id: "beauty-care", name: "美妆个护", keywords: ["精华液","洁面乳","电动牙刷"], color: "#ec4899", icon: "💄", enabled: true },
    { id: "kitchen-appliances", name: "厨房小电", keywords: ["空气炸锅","破壁机","榨汁机"], color: "#ef4444", icon: "🍳", enabled: true },
    { id: "mother-baby", name: "母婴玩具", keywords: ["纸尿裤","积木玩具","学习桌椅"], color: "#06b6d4", icon: "🧸", enabled: true },
    { id: "sports-fitness", name: "运动健身", keywords: ["瑜伽垫","哑铃","跑步鞋"], color: "#06b6d4", icon: "🏃", enabled: true },
    { id: "food-health", name: "食品保健", keywords: ["坚果零食","挂耳咖啡","益生菌"], color: "#84cc16", icon: "☕", enabled: true },
  ],
  globalKeywords: [],
  platformKeywords: {},
};

export async function GET() {
  const config = await readJson<CustomizationConfig>("config.json");
  if (config) return NextResponse.json(config);
  return NextResponse.json(DEFAULT_CONFIG);
}

export async function PUT() {
  return NextResponse.json({
    ok: false,
    error: "Config updates not supported on edge runtime. Use local dev mode.",
  }, { status: 405 });
}
