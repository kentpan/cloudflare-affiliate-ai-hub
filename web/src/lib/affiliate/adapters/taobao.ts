// 淘宝联盟 (淘宝客) adapter — uses the open platform when credentials
// are configured, otherwise falls back to a realistic mock generator.

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class TaobaoAdapter implements IAdapter {
  platform = "taobao" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.taobao.appKey && config.taobao.appSecret && config.taobao.adzoneId) {
      try {
        return await this.invoke("taobao.tbk.dg.material.optional", {
          page_no: 1,
          page_size: 40,
          sort: "tk_total_commission_desc",
          has_coupon: true,
          q: opts.keywords?.[0] ?? "",
        });
      } catch (e) {
        console.warn("[taobao] open platform failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(40, opts.keywords);
  }

  private sign(params: Record<string, string>): string {
    const secret = config.taobao.appSecret!;
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
    const { appKey, appSecret, adzoneId } = config.taobao;
    if (!appKey || !appSecret || !adzoneId) return [];
    const sys: Record<string, string> = {
      method,
      app_key: appKey,
      timestamp: new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, ""),
      format: "json",
      v: "2.0",
      sign_method: "md5",
    };
    const biz = { adzone_id: adzoneId, ...bizParams };
    const allParams: Record<string, string> = {
      ...sys,
      ...Object.fromEntries(
        Object.entries(biz).map(([k, v]) => [
          k,
          typeof v === "object" ? JSON.stringify(v) : String(v),
        ]),
      ),
    };
    allParams.sign = this.sign(allParams);
    const url = `https://eco.taobao.com/router/rest?${new URLSearchParams(allParams).toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.tbk_dg_material_optional_response?.result_list?.map_data ?? [];
    return list.map((it: any): RawProduct => ({
      id: String(it.item_id),
      platform: "taobao",
      title: it.title,
      price: Number(it.zk_final_price),
      originalPrice: Number(it.reserve_price),
      commissionRate: Number(it.commission_rate),
      salesVolume: Number(it.volume),
      couponAmount: Number(it.coupon_amount || 0),
      category: it.category_name ?? "其它",
      imageUrl: it.pict_url,
      link: it.click_url,
      shopName: it.shop_title,
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
      const price = Math.round(seed.basePrice * randInRange([0.6, 1.1]) * 100) / 100;
      const commission = randInRange([seed.commissionRange[0] + 3, seed.commissionRange[1] + 8]);
      out.push({
        id: `tbk-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "taobao",
        title: seed.title,
        price,
        originalPrice: Math.round(price * randInRange([1.3, 1.8]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/tbk${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://pub.alimama.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: seed.shop,
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}
