// 快手电商(快手联盟)adapter — uses 快手开放平台 when credentials
// are configured, otherwise falls back to a realistic mock generator.

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class KuaishouAdapter implements IAdapter {
  platform = "kuaishou" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.kuaishou.appKey && config.kuaishou.appSecret) {
      try {
        return await this.invoke("open.kuaishou.material.product.list", {
          pageNo: 1,
          pageSize: 40,
          sortType: 2, // 2=佣金比例降序
          keyword: opts.keywords?.[0] ?? "",
        });
      } catch (e) {
        console.warn("[kuaishou] open platform failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(30, opts.keywords);
  }

  // 快手开放平台签名:MD5(appSecret + sortedParams + appSecret).toUpperCase()
  private sign(params: Record<string, string>): string {
    const secret = config.kuaishou.appSecret!;
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

  private async invoke(method: string, bizParams: Record<string, unknown>): Promise<RawProduct[]> {
    const { appKey, appSecret } = config.kuaishou;
    if (!appKey || !appSecret) return [];
    const sys: Record<string, string> = {
      appkey: appKey,
      method,
      signMethod: "MD5",
      timestamp: String(Date.now()),
      version: "1",
      paramJson: JSON.stringify(bizParams),
    };
    sys.sign = this.sign(sys);
    const url = `https://open.kuaishou.com/openapi?${new URLSearchParams(sys).toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.data?.productList ?? [];
    return list.map((it: any): RawProduct => ({
      id: String(it.itemId),
      platform: "kuaishou",
      title: it.itemTitle,
      price: Number(it.itemPrice) / 100,
      originalPrice: Number(it.originPrice) / 100,
      commissionRate: Number(it.commissionRate),
      salesVolume: Number(it.soldCount),
      category: it.cateName ?? "其它",
      imageUrl: it.itemPic,
      link: `https://www.kuaishou.com/goods/${it.itemId}`,
      couponAmount: Number(it.couponAmount) / 100,
      shopName: "快手小店",
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
      const price = Math.round(seed.basePrice * randInRange([0.75, 1.15]) * 100) / 100;
      const commission = randInRange([seed.commissionRange[0] + 2, seed.commissionRange[1] + 8]);
      out.push({
        id: `kuaishou-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "kuaishou",
        title: `快手优选 ${seed.title}`,
        price,
        originalPrice: Math.round(price * randInRange([1.2, 1.5]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/ks${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://www.kuaishou.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: "快手电商",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}
