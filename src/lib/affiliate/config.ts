// Runtime configuration for the affiliate picker.
// Mirrors the env-var design from the plan but falls back to safe defaults
// so the demo runs without real联盟 API credentials.

// Data directory path.
// Only used by node-data-writer.ts (scripts/generator, Node.js context).
// API routes use fetch() to read from /data/ (static files).
const DATA_DIR = process.env.DATA_DIR || ".data";

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
  pdd: {
    clientId: process.env.PDD_CLIENT_ID,
    clientSecret: process.env.PDD_CLIENT_SECRET,
    pid: process.env.PDD_PID,
  },
  douyin: {
    appKey: process.env.DY_APP_KEY,
    appSecret: process.env.DY_APP_SECRET,
    pid: process.env.DY_PID,
  },
  kuaishou: {
    appKey: process.env.KS_APP_KEY,
    appSecret: process.env.KS_APP_SECRET,
  },
  xhs: {
    appId: process.env.XHS_APP_ID,
    appSecret: process.env.XHS_APP_SECRET,
  },
  push: {
    urls: (process.env.RECEIVE_URL ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    // v3.9: 统一使用站点级 Bearer (与 matrix-sync SDK 一致)
    // matrix-tentans /api/feishu-wikis/ingest + /api/full-pipeline/* 都用 site-auth.ts 校验
    token: process.env.MATRIX_API_KEY,
  },
  dataDir: DATA_DIR,
  // Concurrency-limit retry policy (per user instruction).
  llmRetry: {
    maxAttempts: 10,
    delayMs: 3000,
    triggerPhrase: "concurrency limit exceeded",
  },
} as const;
