// Credential writer — routes credential writes to the appropriate backend
// based on the detected runtime environment.
//
//   cloudflare     → Cloudflare Pages API (PATCH /accounts/.../pages/projects/...)
//   github-actions → GitHub API (PUT /repos/.../actions/secrets/...) with libsodium encryption
//   local          → .env file (fs.appendFileSync / fs.writeFileSync)
//
// All backends return a masked representation of the stored credential so the
// API route never leaks the plaintext back to the client.

import fs from "node:fs";
import path from "node:path";
import { detectEnv } from "./env";

export interface WriteResult {
  key: string;
  stored: boolean;
  maskedValue: string;
  /** Where it was stored (for display) */
  location: string;
}

export interface WriteError {
  key: string;
  error: string;
}

/**
 * Mask a credential value for display.
 * Shows first 4 + last 4 chars with •••• in between.
 * Short values (< 12 chars) are fully masked.
 */
export function maskValue(value: string): string {
  if (!value) return "";
  if (value.length < 12) return "•".repeat(value.length);
  return value.slice(0, 4) + "•".repeat(8) + value.slice(-4);
}

// ─── Cloudflare Pages API ──────────────────────────────────────────────────

async function writeToCloudflare(
  entries: Array<{ key: string; value: string }>,
): Promise<{ results: WriteResult[]; errors: WriteError[] }> {
  const results: WriteResult[] = [];
  const errors: WriteError[] = [];

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

  // CF Pages API supports batch update via PATCH on the project
  // env_vars object. We set both production and preview environments.
  const envVars: Record<string, { type: "secret_text"; value: string }> = {};
  for (const { key, value } of entries) {
    if (!value) continue;
    envVars[key] = { type: "secret_text", value };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deployment_configs: {
          production: { env_vars: envVars },
          preview: { env_vars: envVars },
        },
      }),
    });
    const data = await res.json() as { success: boolean; errors?: Array<{ message: string }> };
    if (!data.success) {
      const msg = data.errors?.[0]?.message ?? "Cloudflare API error";
      for (const { key } of entries) {
        errors.push({ key, error: msg });
      }
      return { results, errors };
    }
    for (const { key, value } of entries) {
      if (!value) continue;
      results.push({
        key,
        stored: true,
        maskedValue: maskValue(value),
        location: `CF Pages: ${projectName}`,
      });
    }
  } catch (e) {
    for (const { key } of entries) {
      errors.push({ key, error: (e as Error).message });
    }
  }
  return { results, errors };
}

// ─── GitHub Actions Secrets API ────────────────────────────────────────────

async function writeToGitHub(
  entries: Array<{ key: string; value: string }>,
): Promise<{ results: WriteResult[]; errors: WriteError[] }> {
  const results: WriteResult[] = [];
  const errors: WriteError[] = [];

  const token = process.env.GITHUB_TOKEN!;
  const repo = process.env.GITHUB_REPOSITORY!; // "owner/repo"
  const apiBase = process.env.GITHUB_API_URL || "https://api.github.com";

  // Step 1: get the repo's public key for sealed-box encryption
  let publicKey: { key: string; key_id: string };
  try {
    const res = await fetch(`${apiBase}/repos/${repo}/actions/secrets/public-key`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to get public key: ${res.status} ${errText}`);
    }
    publicKey = (await res.json()) as { key: string; key_id: string };
  } catch (e) {
    for (const { key } of entries) {
      errors.push({ key, error: (e as Error).message });
    }
    return { results, errors };
  }

  // Step 2: encrypt each value and PUT to the secrets API
  // tweetsodium is loaded via eval-require to completely hide it from the
  // bundler's static analysis (its libsodium-wrappers dep is a WASM module
  // that breaks Turbopack's build-time resolution).
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const sodium = (0, eval)("require")("tweetsodium");

  for (const { key, value } of entries) {
    if (!value) continue;
    try {
      // Encrypt with libsodium sealed box
      const messageBytes = Buffer.from(value, "utf8");
      const keyBytes = Buffer.from(publicKey.key, "base64");
      const encryptedBytes = sodium.seal(messageBytes, keyBytes);
      const encryptedValue = Buffer.from(encryptedBytes).toString("base64");

      const res = await fetch(`${apiBase}/repos/${repo}/actions/secrets/${key}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encrypted_value: encryptedValue,
          key_id: publicKey.key_id,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        errors.push({ key, error: `GitHub API ${res.status}: ${errText}` });
        continue;
      }
      results.push({
        key,
        stored: true,
        maskedValue: maskValue(value),
        location: `GitHub Actions: ${repo}`,
      });
    } catch (e) {
      errors.push({ key, error: (e as Error).message });
    }
  }
  return { results, errors };
}

// ─── Local .env file ───────────────────────────────────────────────────────

function writeToLocal(
  entries: Array<{ key: string; value: string }>,
): { results: WriteResult[]; errors: WriteError[] } {
  const results: WriteResult[] = [];
  const errors: WriteError[] = [];

  // .env is at the project root (affiliate-ai-hub/.env)
  // It is gitignored — see .gitignore "env files" section.
  const envPath = path.resolve(process.cwd(), ".env");

  // Read existing .env (if any) to preserve other vars
  let existing: Record<string, string> = {};
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        existing[k] = v;
      }
    }
  } catch {
    /* ignore read errors — start fresh */
  }

  // Merge: new values override existing
  for (const { key, value } of entries) {
    if (!value) continue;
    existing[key] = value;
  }

  // Write back
  try {
    const lines: string[] = [
      "# Affiliate AI Hub — local development credentials",
      "# This file is gitignored. DO NOT commit.",
      "# Generated by the credentials panel.",
      "",
    ];
    for (const [k, v] of Object.entries(existing)) {
      // Quote values that contain spaces or special chars
      if (/[\s#"']/.test(v)) {
        lines.push(`${k}="${v.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${k}=${v}`);
      }
    }
    fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");

    for (const { key, value } of entries) {
      if (!value) continue;
      results.push({
        key,
        stored: true,
        maskedValue: maskValue(value),
        location: ".env",
      });
    }
  } catch (e) {
    for (const { key } of entries) {
      errors.push({ key, error: (e as Error).message });
    }
  }
  return { results, errors };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Write credentials to the appropriate backend based on the current environment.
 * Returns masked values — never the plaintext.
 */
export async function writeCredentials(
  entries: Array<{ key: string; value: string }>,
): Promise<{ results: WriteResult[]; errors: WriteError[] }> {
  // Filter out empty values
  const nonEmpty = entries.filter((e) => e.key && e.value);

  const env = detectEnv();
  switch (env) {
    case "cloudflare":
      return writeToCloudflare(nonEmpty);
    case "github-actions":
      return writeToGitHub(nonEmpty);
    case "local":
    default:
      return writeToLocal(nonEmpty);
  }
}
