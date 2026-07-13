// Runtime configuration for the affiliate picker.
// Mirrors the env-var design from the plan but falls back to safe defaults
// so the demo runs without real联盟 API credentials.

import path from "node:path";

// .data/ lives at the monorepo root (affiliate-ai-hub/.data/), one level
// above the web/ app. When Next.js dev/prod runs from affiliate-ai-hub/web/,
// process.cwd() is web/, so ".." resolves to affiliate-ai-hub/.
// Allow explicit override via DATA_DIR env var.
const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : path.join(process.cwd(), "..", ".data");

export const config = {
  llm: {
    // z-ai-web-dev-sdk is the default backend AI provider in this stack.
    baseURL: process.env.LLMAI_BASE_URL ?? "https://llmapi.xubaoge.com/v1",
    apiKey: process.env.LLMAI_APIKEY ?? "",
    model: process.env.LLMAI_MODEL ?? "glm-5.2",
  },
  amazon: {
    accessKey: process.env.AMZ_ACCESS_KEY,
    secretKey: process.env.AMZ_SECRET_KEY,
    partnerTag: process.env.AMZ_PARTNER_TAG,
    marketplace: process.env.AMZ_MARKETPLACE ?? "www.amazon.com",
    host: process.env.AMZ_HOST ?? "webservices.amazon.com",
    region: process.env.AMZ_REGION ?? "us-east-1",
  },
  taobao: {
    appKey: process.env.TBK_APP_KEY,
    appSecret: process.env.TBK_APP_SECRET,
    adzoneId: process.env.TBK_ADZONE_ID,
    pid: process.env.TBK_PID,
  },
  jd: {
    appKey: process.env.JD_APP_KEY,
    appSecret: process.env.JD_APP_SECRET,
    accessToken: process.env.JD_ACCESS_TOKEN,
    siteId: process.env.JD_SITE_ID,
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    cseId: process.env.GOOGLE_CSE_ID,
  },
  push: {
    urls: (process.env.RECEIVE_URL ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    token: process.env.RECEIVE_TOKEN,
  },
  dataDir: DATA_DIR,
  // Concurrency-limit retry policy (per user instruction).
  llmRetry: {
    maxAttempts: 10,
    delayMs: 3000,
    triggerPhrase: "concurrency limit exceeded",
  },
} as const;
