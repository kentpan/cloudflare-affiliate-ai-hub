// 京东联盟 (JD Union) adapter — uses JOS when credentials configured,
// otherwise falls back to a realistic mock generator.

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class JdAdapter implements IAdapter {
  platform = "jd" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.jd.appKey && config.jd.appSecret) {
      try {
        return await this.invoke("jd.union.open.goods.query", {
          goodsReq: {
            keyword: opts.keywords?.[0] ?? "热卖",
            pageIndex: 1,
            pageSize: 40,
            sortName: "price",
            sort: "desc",
            owner: "g",
          },
        });
      } catch (e) {
        console.warn("[jd] open platform failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(35, opts.keywords);
  }

  private sign(params: Record<string, string>): string {
    const secret = config.jd.appSecret!;
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

  private async invoke(method: string, bizReq: Record<string, unknown>): Promise<RawProduct[]> {
    const { appKey, appSecret, accessToken } = config.jd;
    if (!appKey || !appSecret) return [];
    const sys: Record<string, string> = {
      method,
      app_key: appKey,
      access_token: accessToken ?? "",
      timestamp: new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, ""),
      format: "json",
      v: "1.0",
      sign_method: "md5",
      "360buy_param_json": JSON.stringify(bizReq),
    };
    sys.sign = this.sign(sys);
    const url = `https://api.jd.com/routerjson?${new URLSearchParams(sys).toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.jd_union_open_goods_query_response?.result?.data ?? [];
    return list.map((it: any): RawProduct => {
      const info = it.goodsInfo ?? it;
      return {
        id: String(info.skuId),
        platform: "jd",
        title: info.skuName,
        price: Number(info.lowestCouponPrice || info.price),
        originalPrice: Number(info.jdPrice),
        commissionRate: Number(info.commissionShare),
        salesVolume: Number(info.inOrderCount30Days),
        category: it.categoryInfo?.cname ?? "其它",
        imageUrl: info.imageUrl,
        link: info.materialUrl,
        shopName: "京东",
      };
    });
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
      const price = Math.round(seed.basePrice * randInRange([0.9, 1.3]) * 100) / 100;
      const commission = randInRange([seed.commissionRange[0] + 1, seed.commissionRange[1] + 5]);
      out.push({
        id: `jd-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "jd",
        title: `京东自营 ${seed.title}`,
        price,
        originalPrice: Math.round(price * randInRange([1.2, 1.5]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/jd${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://union.jd.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: "京东自营",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}
