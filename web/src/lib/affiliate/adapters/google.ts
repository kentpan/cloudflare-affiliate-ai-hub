// Google adapter — uses Programmable Search JSON API when credentials
// configured, otherwise falls back to a realistic mock generator.

import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class GoogleAdapter implements IAdapter {
  platform = "google" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.google.apiKey && config.google.cseId) {
      try {
        return await this.searchGoogle(opts.keywords);
      } catch (e) {
        console.warn("[google] CSE failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(25, opts.keywords);
  }

  private async searchGoogle(keywords?: string[]): Promise<RawProduct[]> {
    const searchKeywords = keywords && keywords.length
      ? keywords.slice(0, 3)
      : ["best selling gadgets 2026", "trending tech gifts", "top rated home gadgets"];
    const all = await Promise.all(
      searchKeywords.map((kw) =>
        fetch(
          `https://www.googleapis.com/customsearch/v1?key=${config.google.apiKey}&cx=${config.google.cseId}&q=${encodeURIComponent(kw)}&num=10`,
        )
          .then((r) => r.json())
          .then((d) => d?.items ?? [])
          .catch(() => []),
      ),
    );
    return all.flat().map((it: any): RawProduct => ({
      id: it.cacheId || it.link,
      platform: "google",
      title: it.title,
      price: parsePrice(it.pagemap?.offer?.[0]?.price),
      commissionRate: 4,
      category: "Search",
      imageUrl: it.pagemap?.cse_image?.[0]?.src || it.pagemap?.cse_thumbnail?.[0]?.src,
      link: it.link,
      shopName: "Google Shopping",
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
      const price = Math.round(seed.basePrice * randInRange([1.1, 1.6]) * 100) / 100;
      const commission = randInRange([3, 7]);
      out.push({
        id: `gg-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "google",
        title: seed.title,
        price,
        originalPrice: Math.round(price * randInRange([1.1, 1.3]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt([seed.salesRange[0] / 2, seed.salesRange[1] / 2]),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt([seed.reviewRange[0] / 2, seed.reviewRange[1] / 2]),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/gg${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://shopping.google.com/",
        shopName: "Google Shopping",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}

function parsePrice(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
