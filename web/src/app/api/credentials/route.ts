// GET  /api/credentials  — list credential keys + masked values + which are set
// PUT  /api/credentials  — update credential values (writes to .env.local in web/)
//
// Credentials are联盟 API keys (LLMAI_APIKEY, AMZ_*, TBK_*, JD_*, GOOGLE_*,
// RECEIVE_URL, RECEIVE_TOKEN). Values are masked in GET responses for safety.

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

// Credential key definitions: { key, label, group, required, mask }
const CREDENTIAL_DEFS: Array<{
  key: string;
  label: string;
  group: string;
  required?: boolean;
  mask?: boolean;
  placeholder?: string;
}> = [
  // AI 推理
  { key: "LLMAI_APIKEY", label: "AI 推理密钥", group: "AI 推理", required: true, mask: true, placeholder: "sk-..." },
  { key: "LLMAI_BASE_URL", label: "AI Base URL", group: "AI 推理", placeholder: "https://llmapi.xubaoge.com/v1" },
  { key: "LLMAI_MODEL", label: "AI 模型", group: "AI 推理", placeholder: "glm-5.2" },
  // Amazon
  { key: "AMZ_ACCESS_KEY", label: "Access Key", group: "Amazon PA-API", mask: true },
  { key: "AMZ_SECRET_KEY", label: "Secret Key", group: "Amazon PA-API", mask: true },
  { key: "AMZ_PARTNER_TAG", label: "Partner Tag", group: "Amazon PA-API", placeholder: "yourtag-20" },
  { key: "AMZ_MARKETPLACE", label: "Marketplace", group: "Amazon PA-API", placeholder: "www.amazon.com" },
  // 淘宝客
  { key: "TBK_APP_KEY", label: "App Key", group: "淘宝客", mask: true },
  { key: "TBK_APP_SECRET", label: "App Secret", group: "淘宝客", mask: true },
  { key: "TBK_ADZONE_ID", label: "广告位 ID", group: "淘宝客" },
  { key: "TBK_PID", label: "PID (可选)", group: "淘宝客" },
  // 京东
  { key: "JD_APP_KEY", label: "App Key", group: "京东联盟", mask: true },
  { key: "JD_APP_SECRET", label: "App Secret", group: "京东联盟", mask: true },
  { key: "JD_ACCESS_TOKEN", label: "Access Token", group: "京东联盟", mask: true },
  { key: "JD_SITE_ID", label: "Site ID", group: "京东联盟" },
  // Google
  { key: "GOOGLE_API_KEY", label: "API Key", group: "Google", mask: true },
  { key: "GOOGLE_CSE_ID", label: "CSE ID", group: "Google" },
  // 推送
  { key: "RECEIVE_URL", label: "推送 URL (逗号分隔)", group: "推送目标" },
  { key: "RECEIVE_TOKEN", label: "推送 Token (可选)", group: "推送目标", mask: true },
];

function getEnvLocalPath(): string {
  // web/.env.local — the dev server loads this automatically.
  return path.join(process.cwd(), ".env.local");
}

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function maskValue(val: string): string {
  if (!val) return "";
  if (val.length <= 8) return "•".repeat(val.length);
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 8, 12)) + val.slice(-4);
}

export async function GET() {
  const envLocal = parseEnvFile(getEnvLocalPath());
  const credentials = CREDENTIAL_DEFS.map((def) => {
    const value = envLocal[def.key] ?? process.env[def.key] ?? "";
    return {
      ...def,
      isSet: Boolean(value),
      maskedValue: def.mask ? maskValue(value) : value,
    };
  });
  return NextResponse.json({ credentials, envLocalExists: fs.existsSync(getEnvLocalPath()) });
}

export async function PUT(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Read existing .env.local
  const envPath = getEnvLocalPath();
  const existing = parseEnvFile(envPath);

  // Merge: only update keys that are in CREDENTIAL_DEFS and have non-empty value
  const validKeys = new Set(CREDENTIAL_DEFS.map((d) => d.key));
  let updatedCount = 0;
  for (const [key, val] of Object.entries(body)) {
    if (!validKeys.has(key)) continue;
    if (typeof val !== "string") continue;
    // Skip empty values (don't clear existing)
    if (!val.trim()) continue;
    // Skip masked values (user didn't change them)
    if (val.includes("•")) continue;
    existing[key] = val.trim();
    updatedCount += 1;
  }

  // Write .env.local
  const lines: string[] = [
    "# 联盟 AI 选品中心 — 凭证配置",
    "# 由 /api/credentials 自动生成，请勿手动编辑",
    `# Updated: ${new Date().toISOString()}`,
    "",
  ];
  for (const def of CREDENTIAL_DEFS) {
    const val = existing[def.key];
    if (val) {
      lines.push(`${def.key}=${val.includes(" ") ? `"${val}"` : val}`);
    }
  }
  fs.writeFileSync(envPath, lines.join("\n"), "utf8");

  return NextResponse.json({
    ok: true,
    updatedCount,
    message: `已更新 ${updatedCount} 项凭证，重启 dev server 后生效（或下次沙盒启动时自动加载）`,
  });
}
