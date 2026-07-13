// Amazon adapter — uses PA-API 5.0 when credentials are configured,
// otherwise falls back to a realistic mock generator so the demo runs
// out of the box.

import crypto from "node:crypto";
import { config } from "../config";
import type { RawProduct } from "../types";
import type { IAdapter, AdapterFetchOptions } from "./base";
import { MOCK_CATALOG, pickRandom, randInRange, randInt } from "./mock-catalog";

export class AmazonAdapter implements IAdapter {
  platform = "amazon" as const;

  async fetchTrending(opts: AdapterFetchOptions = {}): Promise<RawProduct[]> {
    if (config.amazon.accessKey && config.amazon.secretKey) {
      try {
        const kw = opts.keywords?.[0] ?? "trending electronics";
        return await this.searchItems(kw, 30);
      } catch (e) {
        console.warn("[amazon] PA-API failed, falling back to mock:", (e as Error).message);
      }
    }
    return this.mockFetch(30, opts.keywords);
  }

  // AWS Signature V4 PA-API SearchItems (kept for parity with the plan).
  private async searchItems(keywords: string, itemCount = 30): Promise<RawProduct[]> {
    const { accessKey, secretKey, partnerTag, marketplace, host, region } = config.amazon;
    if (!accessKey || !secretKey || !partnerTag) return [];

    const service = "ProductAdvertisingAPI";
    const path = "/paapi5/searchitems";
    const payload = JSON.stringify({
      Keywords: keywords,
      ItemCount: itemCount,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      Resources: [
        "ItemInfo.Title",
        "Images.Primary.Large",
        "Offers.Listings.Price",
        "CustomerReviews.StarRating",
        "CustomerReviews.Count",
      ],
    });

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n`;
    const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
    const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
    const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
    const sigKey = getSignatureKey(secretKey, dateStamp, region, service);
    const signature = crypto.createHmac("sha256", sigKey).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        host,
        "x-amz-date": amzDate,
        "x-amz-target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
        Authorization: authorization,
      },
      body: payload,
    });
    const data = await res.json();
    const items = data?.SearchResult?.Items ?? [];
    return items.map((it: any): RawProduct => ({
      id: it.ASIN,
      platform: "amazon",
      title: it.ItemInfo?.Title?.DisplayValue ?? "",
      price: it.Offers?.Listings?.[0]?.Price?.Amount ?? 0,
      commissionRate: estimateAmazonCommission(it.ItemInfo?.Title?.DisplayValue ?? ""),
      rating: it.CustomerReviews?.StarRating,
      reviewCount: it.CustomerReviews?.Count,
      category: keywords,
      imageUrl: it.Images?.Primary?.Large?.URL,
      link: it.DetailPageURL,
      shopName: "Amazon",
    }));
  }

  private mockFetch(count: number, keywords?: string[]): RawProduct[] {
    const out: RawProduct[] = [];
    // Bias catalog selection toward keywords when provided.
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
      const price = Math.round(seed.basePrice * randInRange([0.8, 1.4]) * 100) / 100;
      const commission = randInRange(seed.commissionRange);
      out.push({
        id: `amz-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "amazon",
        title: seed.title,
        price,
        originalPrice: Math.round(price * randInRange([1.15, 1.4]) * 100) / 100,
        commissionRate: commission,
        salesVolume: randInt(seed.salesRange),
        rating: randInRange(seed.ratingRange),
        reviewCount: randInt(seed.reviewRange),
        category: seed.category,
        imageUrl: `https://picsum.photos/seed/amz${i}${seed.imageQuery.replace(/\s/g, "")}/400/300`,
        link: "https://www.amazon.com/",
        couponAmount: randInt(seed.couponRange),
        shopName: "Amazon",
        isVirtual: seed.isVirtual ?? false,
        deliveryType: seed.deliveryType ?? "physical",
        meta: { source: "mock" },
      });
    }
    return out;
  }
}

function estimateAmazonCommission(title: string): number {
  const t = title.toLowerCase();
  if (/headphone|earbud|speaker|laptop|phone/.test(t)) return 4;
  if (/kitchen|cookware|appliance/.test(t)) return 4.5;
  if (/toy|game/.test(t)) return 6;
  if (/book/.test(t)) return 4.5;
  return 3.5;
}

function getSignatureKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate = hmac(Buffer.from("AWS4" + secret), date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function hmac(key: Buffer | string, msg: string): Buffer {
  return crypto.createHmac("sha256", key).update(msg).digest();
}
