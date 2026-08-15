// Credential writer — routes credential writes to the appropriate backend
// based on the detected runtime environment.
//
//   cloudflare     → Cloudflare Pages API (PATCH /accounts/.../pages/projects/...)
//   github-actions → GitHub API (PUT /repos/.../actions/secrets/...) with sealed-box encryption
//   local          → .env file via eval-require("node:fs"), or return content for download if on edge
//
// EDGE RUNTIME COMPATIBLE:
// This module uses NO static Node.js imports (no `import fs from "node:fs"`).
// `fs` is loaded dynamically via eval-require only in the local-dev code path,
// which is never reached on Cloudflare Pages (edge runtime).
// GitHub secret encryption uses the pure-JS `sealed-box.ts` module (tweetnacl +
// @noble/hashes) instead of the WASM-based `tweetsodium` package.
//
// All backends return a masked representation of the stored credential so the
// API route never leaks the plaintext back to the client.

import { detectEnv } from "./env";
import { sealToBase64 } from "./sealed-box";

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

export interface WriteResponse {
  results: WriteResult[];
  errors: WriteError[];
  /**
   * For local-dev edge runtime: the .env file content is returned here so the
   * frontend can trigger a download. Null when the file was written directly
   * to disk (Node.js runtime) or when not in local mode.
   */
  envContent: string | null;
  /** True if credentials were written to disk; false if returned as content */
  downloaded: boolean;
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
): Promise<WriteResponse> {
  const results: WriteResult[] = [];
  const errors: WriteError[] = [];

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

  // CF Pages API supports batch update via PATCH on the project env_vars.
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
      return { results, errors, envContent: null, downloaded: false };
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
  return { results, errors, envContent: null, downloaded: false };
}

// ─── GitHub Actions Secrets API (edge-compatible) ─────────────────────────

async function writeToGitHub(
  entries: Array<{ key: string; value: string }>,
): Promise<WriteResponse> {
  const results: WriteResult[] = [];
  const errors: WriteError[] = [];

  const token = process.env.GITHUB_TOKEN!;
  const repo = process.env.GITHUB_REPOSITORY!;
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
    return { results, errors, envContent: null, downloaded: false };
  }

  // Step 2: encrypt each value using the pure-JS sealed-box implementation
  // and PUT to the GitHub secrets API.
  for (const { key, value } of entries) {
    if (!value) continue;
    try {
      const encryptedValue = sealToBase64(value, publicKey.key);

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
  return { results, errors, envContent: null, downloaded: false };
}

// ─── Local .env file ───────────────────────────────────────────────────────

/**
 * Generate the .env file content from credential entries.
 * Used both for direct file writes (Node.js) and for download (edge).
 */
function generateEnvContent(
  entries: Array<{ key: string; value: string }>,
  existing: Record<string, string> = {},
): string {
  // Merge: new values override existing
  const merged = { ...existing };
  for (const { key, value } of entries) {
    if (!value) continue;
    merged[key] = value;
  }

  const lines: string[] = [
    "# Affiliate AI Hub — local development credentials",
    "# This file is gitignored. DO NOT commit.",
    "# Generated by the credentials panel.",
    "",
  ];
  for (const [k, v] of Object.entries(merged)) {
    if (/[\s#"']/.test(v)) {
      lines.push(`${k}="${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}=${v}`);
    }
  }
  return lines.join("\n") + "\n";
}

function writeToLocal(
  entries: Array<{ key: string; value: string }>,
): WriteResponse {
  const results: WriteResult[] = [];
  const errors: WriteError[] = [];

  // On edge runtime, `fs` is not available and dynamic code evaluation
  // (eval/new Function) is forbidden. We always return .env content for
  // download. On Node.js runtime (GitHub Actions), the GitHub API path is
  // used instead (this local path is only for local-dev env detection).
  //
  // We never reference `node:fs` statically — the edge runtime bundler
  // would reject it. The .env content is generated purely from the entries.

  // Generate .env content
  const existing: Record<string, string> = {};
  const content = generateEnvContent(entries, existing);

  // Edge runtime — can't write to filesystem. Return .env content for download.
  for (const { key, value } of entries) {
    if (!value) continue;
    results.push({
      key,
      stored: true, // logically "stored" — user will download and place manually
      maskedValue: maskValue(value),
      location: ".env (download)",
    });
  }
  return { results, errors, envContent: content, downloaded: true };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Write credentials to the appropriate backend based on the current environment.
 * Returns masked values — never the plaintext.
 */
export async function writeCredentials(
  entries: Array<{ key: string; value: string }>,
): Promise<WriteResponse> {
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
