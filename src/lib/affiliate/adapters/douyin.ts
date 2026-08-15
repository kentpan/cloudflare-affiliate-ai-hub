// 抖音电商(精选联盟)adapter — uses 抖音开放平台 when credentials
// are configured, otherwise falls back to a realistic mock generator.

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class DouyinAdapter implements IAdapter {
  platform = "douyin" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.douyin.appKey && config.douyin.appSecret) {
      try {
        return await this.invoke("/material/product/search", {
          page_no: 1,
          page_size: 40,
          sort: 2, // 2=佣金比例降序
          keyword: opts.keywords?.[0] ?? "",
          pid: config.douyin.pid ?? "",
        });
      } catch (e) {
        console.warn("[douyin] open platform failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(35, opts.keywords);
  }

  // 抖音开放平台签名:SHA256(app_secret + sortedParams + app_secret)
  private sign(params: Record<string, string>): string {
    const secret = config.douyin.appSecret!;
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join("");
    return crypto
      .createHash("sha256")
      .update(secret + sorted + secret, "utf8")
      .digest("hex");
  }

  private async invoke(path: string, bizParams: Record<string, unknown>): Promise<RawProduct[]> {
    const { appKey, appSecret } = config.douyin;
    if (!appKey || !appSecret) return [];
    const sys: Record<string, string> = {
      app_key: appKey,
      method: path,
      timestamp: String(Math.floor(Date.now() / 1000)),
      v: "2",
      sign_method: "sha256",
      param_json: JSON.stringify(bizParams),
    };
    sys.sign = this.sign(sys);
    const url = `https://openapi-fxg.jinritemai.com${path}?${new URLSearchParams(sys).toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.data?.products ?? [];
    return list.map((it: any): RawProduct => ({
      id: String(it.product_id),
      platform: "douyin",
      title: it.product_name,
      price: Number(it.price) / 100,
      originalPrice: Number(it.market_price) / 100,
      commissionRate: Number(it.cos_ratio) / 100,
      salesVolume: Number(it.favor_count),
      category: it.cate_name ?? "其它",
      imageUrl: it.images?.[0] ?? "",
      link: `https://haohuo.jinritemai.com/views/product/item2?id=${it.product_id}`,
      couponAmount: Number(it.coupon_price) / 100,
      shopName: "抖音精选联盟",
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
      const price = Math.round(seed.basePrice * randInRange([0.8, 1.2]) * 100) / 100;
      const commission = randInRange([seed.commissionRange[0] + 3, seed.commissionRange[1] + 10]);
      out.push({
        id: `douyin-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "douyin",
        title: `抖音爆款 ${seed.title}`,
        price,
        originalPrice: Math.round(price * randInRange([1.2, 1.6]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/dy${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://haohuo.jinritemai.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: "抖音小店",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}
