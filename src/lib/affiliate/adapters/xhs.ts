// 小红书蒲公英(PGXHS)adapter — uses 小红书开放平台 when credentials
// are configured, otherwise falls back to a realistic mock generator.
//
// 注意:小红书蒲公英 API 限制较严,需企业资质 + 白名单申请。
// mock 模式生成的数据偏向"种草笔记"风格(小红书特色)。

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class XhsAdapter implements IAdapter {
  platform = "xhs" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.xhs.appId && config.xhs.appSecret) {
      try {
        return await this.invoke("/api/gateway/elite_product/list", {
          page: 1,
          page_size: 40,
          sort: 2, // 2=佣金比例降序
          keyword: opts.keywords?.[0] ?? "",
        });
      } catch (e) {
        console.warn("[xhs] open platform failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(25, opts.keywords);
  }

  // 小红书签名:HMAC-SHA256(appSecret, sortedParams)
  private sign(params: Record<string, string>): string {
    const secret = config.xhs.appSecret!;
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    return crypto.createHmac("sha256", secret).update(sorted, "utf8").digest("hex");
  }

  private async invoke(path: string, bizParams: Record<string, unknown>): Promise<RawProduct[]> {
    const { appId, appSecret } = config.xhs;
    if (!appId || !appSecret) return [];
    const sys: Record<string, string> = {
      appId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      "X-Sign-Method": "HMAC-SHA256",
    };
    sys.sign = this.sign({ ...sys, ...Object.fromEntries(Object.entries(bizParams).map(([k, v]) => [k, String(v)])) });
    const url = `https://edith.xiaohongshu.com${path}?${new URLSearchParams({ ...sys, ...Object.fromEntries(Object.entries(bizParams).map(([k, v]) => [k, String(v)])) }).toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.data?.products ?? [];
    return list.map((it: any): RawProduct => ({
      id: String(it.product_id),
      platform: "xhs",
      title: it.name,
      price: Number(it.price),
      originalPrice: Number(it.original_price),
      commissionRate: Number(it.commission_rate),
      salesVolume: Number(it.sales_count),
      category: it.category_name ?? "其它",
      imageUrl: it.cover_image,
      link: `https://www.xiaohongshu.com/goods/${it.product_id}`,
      couponAmount: Number(it.coupon_amount),
      shopName: "小红书品牌",
    }));
  }

  private mockFetch(count: number, keywords?: string[]): RawProduct[] {
    const out: RawProduct[] = [];
    const pool = keywords && keywords.length
      ? MOCK_CATALOG.filter((s) =>
          keywords.some(
            (k) =>
              s.title.includes(k) ||
              s.category.includes(k) ||
              s.imageQuery.toLowerCase().includes(k.toLowerCase()),
          ),
        )
      : MOCK_CATALOG;
    const catalog = pool.length ? pool : MOCK_CATALOG;
    for (let i = 0; i < count; i++) {
      const seed = pickRandom(catalog);
      const price = Math.round(seed.basePrice * randInRange([0.85, 1.25]) * 100) / 100;
      const commission = randInRange([seed.commissionRange[0] + 1, seed.commissionRange[1] + 6]);
      out.push({
        id: `xhs-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "xhs",
        title: `小红书种草 ${seed.title}`,
        price,
        originalPrice: Math.round(price * randInRange([1.1, 1.4]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/xhs${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://www.xiaohongshu.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: "小红书蒲公英",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}
