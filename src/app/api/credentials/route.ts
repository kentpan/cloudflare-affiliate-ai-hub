// GET  /api/credentials — list credential keys + masked values + env info
// PUT  /api/credentials — write credentials to the appropriate backend:
//                          cloudflare → CF Pages API (env vars)
//                          github-actions → GitHub API (Actions secrets, encrypted)
//                          local → .env file (gitignored)
//                        Always returns masked values — never plaintext.
//
// Uses Node.js runtime (not edge) because local-dev mode needs fs to write .env.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEnvInfo } from "@/lib/affiliate/env";
import { maskValue, writeCredentials } from "@/lib/affiliate/credential-writer";

const CREDENTIAL_KEYS = [
  { key: "LLMAI_APIKEY", label: "AI 推理密钥", group: "AI 推理", required: true, mask: true },
  { key: "LLMAI_BASE_URL", label: "AI Base URL", group: "AI 推理" },
  { key: "LLMAI_MODEL", label: "AI 模型", group: "AI 推理" },
  { key: "AMZ_ACCESS_KEY", label: "Access Key", group: "Amazon PA-API", mask: true },
  { key: "AMZ_SECRET_KEY", label: "Secret Key", group: "Amazon PA-API", mask: true },
  { key: "AMZ_PARTNER_TAG", label: "Partner Tag", group: "Amazon PA-API" },
  { key: "TBK_APP_KEY", label: "App Key", group: "淘宝客", mask: true },
  { key: "TBK_APP_SECRET", label: "App Secret", group: "淘宝客", mask: true },
  { key: "TBK_ADZONE_ID", label: "广告位 ID", group: "淘宝客" },
  { key: "JD_APP_KEY", label: "App Key", group: "京东联盟", mask: true },
  { key: "JD_APP_SECRET", label: "App Secret", group: "京东联盟", mask: true },
  { key: "JD_ACCESS_TOKEN", label: "Access Token", group: "京东联盟", mask: true },
  { key: "GOOGLE_API_KEY", label: "API Key", group: "Google", mask: true },
  { key: "GOOGLE_CSE_ID", label: "CSE ID", group: "Google" },
  { key: "RECEIVE_URL", label: "推送 URL", group: "推送目标" },
  { key: "RECEIVE_TOKEN", label: "推送 Token", group: "推送目标", mask: true },
];

export async function GET() {
  const envInfo = getEnvInfo();
  const credentials = CREDENTIAL_KEYS.map((def) => {
    const value = process.env[def.key] ?? "";
    return {
      ...def,
      isSet: Boolean(value),
      // Always mask — never return plaintext to the client
      maskedValue: def.mask && value
        ? maskValue(value)
        : def.mask
          ? ""
          : value, // non-secret values (URLs, model names) shown as-is
    };
  });
  return NextResponse.json({ credentials, envInfo });
}

export async function PUT(request: Request) {
  const envInfo = getEnvInfo();

  if (!envInfo.writable) {
    return NextResponse.json({
      ok: false,
      error: `当前环境 (${envInfo.label}) 缺少配置: ${envInfo.missingConfig.join(", ")}`,
      envInfo,
    }, { status: 400 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json() as Record<string, string>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Convert to entries, filtering to known keys only (security: don't allow
  // arbitrary env var writes)
  const knownKeys = new Set(CREDENTIAL_KEYS.map((k) => k.key));
  const entries = Object.entries(body)
    .filter(([key]) => knownKeys.has(key))
    .map(([key, value]) => ({ key, value: String(value ?? "") }));

  if (entries.length === 0) {
    return NextResponse.json({ ok: false, error: "No valid credentials provided" }, { status: 400 });
  }

  const { results, errors } = await writeCredentials(entries);

  // Build response — always masked
  const updated = results.map((r) => ({
    key: r.key,
    stored: r.stored,
    maskedValue: r.maskedValue,
  }));

  return NextResponse.json({
    ok: errors.length === 0,
    message: `已写入 ${results.length} 项凭证到 ${envInfo.store}`,
    updatedCount: results.length,
    errorCount: errors.length,
    updated,
    errors,
    envInfo,
  });
}
