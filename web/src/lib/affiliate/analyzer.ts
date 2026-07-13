// AI analyzer — sends the raw product list to the LLM and merges the
// returned scores / marketing copy / tags / reasons back onto the
// original RawProduct records.
//
// Implements the user's concurrency-limit retry policy via chatJSON.

import { chatJSON } from "./llm-client";
import type { PickedProduct, RawProduct } from "./types";

const SYSTEM_PROMPT = `你是资深联盟营销选品专家，擅长从海量商品中挑选高佣金、高转化、适合推广的爆款。
输入为各平台当日抓取的候选商品（JSON 数组），请输出严格 JSON：
{
  "picks": [
    {
      "id": "原始 id，必须与输入一致",
      "score": 0-100 浮点数，综合评分,
      "aiCopy": "50字以内的种草文案，符合小红书/短视频风格，带emoji",
      "aiTags": ["3-5个标签，简洁有力"],
      "reason": "推荐理由，30字以内"
    }
  ]
}
筛选规则（必须严格遵守）：
1) 优先 expectedRevenue = price * commissionRate / 100 高的商品；
2) 兼顾销量(salesVolume)、评分(rating)、评价数(reviewCount)、是否有优惠券(couponAmount)；
3) 剔除标题异常、价格异常(价格为0或负)、疑似刷单(销量高但无评分/评价)的商品——这些不要输出；
4) 品类分布要均衡，单个品类不超过总数的30%；
5) 输出条目数不超过输入的60%，最多60条；
6) score 计算：预期收益权重40% + 销量权重25% + 评分权重20% + 优惠券权重15%，再按品类平衡微调；
7) aiCopy 必须真实可读，不要出现占位符或乱码；
8) 只输出 JSON，不要任何额外文字、不要 markdown 代码块。`;

interface LlMPick {
  id: string;
  score: number;
  aiCopy: string;
  aiTags: string[];
  reason: string;
}

interface LlmResponse {
  picks: LlMPick[];
}

export interface AnalyzeResult {
  picks: PickedProduct[];
  llmAttempts: number;
  llmRetried: boolean;
  llmUsed: boolean;
}

export async function analyze(raw: RawProduct[]): Promise<AnalyzeResult> {
  if (raw.length === 0) {
    return { picks: [], llmAttempts: 0, llmRetried: false, llmUsed: false };
  }

  // Compact payload for the LLM.
  const compact = raw.map((p) => ({
    id: p.id,
    platform: p.platform,
    title: p.title,
    price: p.price,
    commissionRate: p.commissionRate,
    salesVolume: p.salesVolume ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    couponAmount: p.couponAmount ?? 0,
    category: p.category,
  }));

  try {
    const { data, attempts, retried } = await chatJSON<LlmResponse>(
      SYSTEM_PROMPT,
      JSON.stringify(compact),
      { temperature: 0.6 },
    );

    const picksArr = Array.isArray(data?.picks) ? data.picks : [];
    const map = new Map(raw.map((p) => [p.id, p]));
    const picks: PickedProduct[] = picksArr
      .map((pk): PickedProduct | null => {
        const base = map.get(pk.id);
        if (!base) return null;
        const expectedRevenue = round2((base.price * base.commissionRate) / 100);
        const score = clamp(Number(pk.score) || 0, 0, 100);
        return {
          ...base,
          score: round2(score),
          expectedRevenue,
          aiCopy: String(pk.aiCopy ?? "").slice(0, 120),
          aiTags: Array.isArray(pk.aiTags) ? pk.aiTags.slice(0, 6) : [],
          reason: String(pk.reason ?? "").slice(0, 80),
        };
      })
      .filter((p): p is PickedProduct => p !== null);

    return { picks, llmAttempts: attempts, llmRetried: retried, llmUsed: true };
  } catch (e) {
    console.error("[analyzer] LLM failed, using heuristic fallback:", (e as Error).message);
    return { picks: heuristicFallback(raw), llmAttempts: 0, llmRetried: false, llmUsed: false };
  }
}

// Deterministic fallback used when the LLM is unavailable or explicitly
// skipped (e.g. for seeding initial data without burning LLM quota).
export function heuristicFallback(raw: RawProduct[]): PickedProduct[] {
  const scored = raw
    .filter((p) => p.price > 0 && p.commissionRate > 0)
    .map((p) => {
      const expectedRevenue = round2((p.price * p.commissionRate) / 100);
      const salesScore = Math.min(40, Math.log10((p.salesVolume ?? 1) + 1) * 8);
      const ratingScore = (p.rating ?? 4) * 5;
      const couponScore = p.couponAmount ? Math.min(15, p.couponAmount / 5) : 0;
      const revenueScore = Math.min(40, Math.log10(expectedRevenue + 1) * 12);
      const score = round2(clamp(revenueScore + salesScore + ratingScore + couponScore, 0, 100));
      return {
        ...p,
        score,
        expectedRevenue,
        aiCopy: `爆款推荐｜${p.category}好物，佣金${p.commissionRate}%，预期收益¥${expectedRevenue}`,
        aiTags: [p.platform, p.category, p.couponAmount ? "有券" : "热销", "精选"],
        reason: `高佣金+${p.salesVolume ?? 0}销量，转化预期佳`,
      } as PickedProduct;
    })
    .sort((a, b) => b.score - a.score);

  // category balance: max 30% per category
  const byCat = new Map<string, number>();
  const limit = Math.ceil(scored.length * 0.3);
  const balanced: PickedProduct[] = [];
  for (const p of scored) {
    const c = (byCat.get(p.category) ?? 0);
    if (c < limit) {
      balanced.push(p);
      byCat.set(p.category, c + 1);
    }
  }
  return balanced.slice(0, Math.ceil(scored.length * 0.6));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
