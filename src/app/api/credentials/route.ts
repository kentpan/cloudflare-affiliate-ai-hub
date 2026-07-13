// GET /api/credentials — list credential keys + masked values

export const runtime = "edge";
// PUT /api/credentials — update credentials (not supported on edge)
//
// On Cloudflare Pages (edge runtime), credentials are managed via
// GitHub Secrets / Cloudflare environment variables, not via this API.

import { NextResponse } from "next/server";


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
  const credentials = CREDENTIAL_KEYS.map((def) => {
    const value = process.env[def.key] ?? "";
    return {
      ...def,
      isSet: Boolean(value),
      maskedValue: def.mask && value ? value.slice(0, 4) + "•".repeat(8) + value.slice(-4) : value,
    };
  });
  return NextResponse.json({ credentials, envLocalExists: false });
}

export async function PUT() {
  return NextResponse.json({
    ok: false,
    error: "Credential updates not supported on edge runtime. Use GitHub Secrets or Cloudflare environment variables.",
  }, { status: 405 });
}
