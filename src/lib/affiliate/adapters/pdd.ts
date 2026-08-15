// 拼多多多多客 (PDD Duoduoke) adapter — uses 多多客 OpenAPI when credentials
// are configured, otherwise falls back to a realistic mock generator.

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class PddAdapter implements IAdapter {
  platform = "pdd" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.pdd.clientId && config.pdd.clientSecret) {
      try {
        return await this.invoke("pdd.ddk.goods.recommend.get", {
          offset: 0,
          limit: 40,
          pid: config.pdd.pid ?? "",
          sort_type: 1, // 1=佣金比例降序
        });
      } catch (e) {
        console.warn("[pdd] open platform failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(35, opts.keywords);
  }

  // 多多客签名:MD5(secret + sortedParams + secret).toUpperCase()
  private sign(params: Record<string, string>): string {
    const secret = config.pdd.clientSecret!;
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join("");
    return crypto
      .createHash("md5")
      .update(secret + sorted + secret, "utf8")
      .digest("hex")
      .toUpperCase();
  }

  private async invoke(type: string, bizParams: Record<string, unknown>): Promise<RawProduct[]> {
    const { clientId, clientSecret } = config.pdd;
    if (!clientId || !clientSecret) return [];
    const sys: Record<string, string> = {
      type,
      client_id: clientId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      data_type: "JSON",
    };
    sys.sign = this.sign({ ...sys, ...Object.fromEntries(Object.entries(bizParams).map(([k, v]) => [k, String(v)])) });
    const url = `https://gw-api.pinduoduo.com/api/router?${new URLSearchParams({ ...sys, ...Object.fromEntries(Object.entries(bizParams).map(([k, v]) => [k, String(v)])) }).toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.goods_basic_detail_response?.list ?? [];
    return list.map((it: any): RawProduct => ({
      id: String(it.goods_sign),
      platform: "pdd",
      title: it.goods_name,
      price: Number(it.min_group_price) / 100,
      originalPrice: Number(it.min_normal_price) / 100,
      commissionRate: Number(it.promotion_rate) / 10,
      salesVolume: Number(it.sales_tip),
      category: it.opt_name ?? "其它",
      imageUrl: it.goods_image_url,
      link: `https://mobile.yangkeduo.com/goods.html?goods_id=${it.goods_sign}`,
      couponAmount: Number(it.coupon_discount) / 100,
      shopName: "拼多多",
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
      const price = Math.round(seed.basePrice * randInRange([0.7, 1.1]) * 100) / 100;
      const commission = randInRange([seed.commissionRange[0] + 5, seed.commissionRange[1] + 15]);
      out.push({
        id: `pdd-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "pdd",
        title: `拼多多百亿补贴 ${seed.title}`,
        price,
        originalPrice: Math.round(price * randInRange([1.3, 1.8]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/pdd${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://mobile.yangkeduo.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: "拼多多官方",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}
