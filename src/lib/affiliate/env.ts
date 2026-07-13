// Runtime environment detection for credential management.
//
// Three deployment targets are supported:
//   1. "cloudflare"      — Cloudflare Pages. Credentials are written to the
//                           Pages project's environment variables via the
//                           Cloudflare REST API.
//   2. "github-actions"  — GitHub Actions runner. Credentials are written to
//                           the repo's Actions secrets via the GitHub API
//                           (encrypted with libsodium sealed box).
//   3. "local"           — Local development. Credentials are written to the
//                           .env file (which is gitignored).
//
// The credentials panel UI uses this to show the user where their credentials
// will be stored. The /api/credentials PUT route uses this to route the
// write request to the appropriate backend.

export type RuntimeEnv = "cloudflare" | "github-actions" | "local";

export interface EnvInfo {
  env: RuntimeEnv;
  label: string;
  description: string;
  /** Where credentials are stored in this env */
  store: string;
  /** Whether credential writes are supported in this env */
  writable: boolean;
  /** Missing configuration keys that prevent writes */
  missingConfig: string[];
}

/**
 * Detect the current runtime environment.
 */
export function detectEnv(): RuntimeEnv {
  // Cloudflare Pages sets CF_PAGES=1 at build & runtime
  if (process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true") {
    return "cloudflare";
  }
  // GitHub Actions sets GITHUB_ACTIONS=true
  if (process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_ACTIONS === "1") {
    return "github-actions";
  }
  // Also detect if we're explicitly configured for CF (env vars set)
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_PAGES_PROJECT) {
    return "cloudflare";
  }
  return "local";
}

/**
 * Get detailed environment info including writability and missing config.
 */
export function getEnvInfo(): EnvInfo {
  const env = detectEnv();

  switch (env) {
    case "cloudflare": {
      const missing: string[] = [];
      if (!process.env.CLOUDFLARE_API_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
      if (!process.env.CLOUDFLARE_ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
      if (!process.env.CLOUDFLARE_PAGES_PROJECT) missing.push("CLOUDFLARE_PAGES_PROJECT");
      return {
        env,
        label: "Cloudflare Pages",
        description: "凭证将通过 Cloudflare API 写入到 Pages 项目的环境变量",
        store: "Cloudflare Pages → Settings → Environment variables",
        writable: missing.length === 0,
        missingConfig: missing,
      };
    }
    case "github-actions": {
      const missing: string[] = [];
      if (!process.env.GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
      if (!process.env.GITHUB_REPOSITORY) missing.push("GITHUB_REPOSITORY");
      return {
        env,
        label: "GitHub Actions",
        description: "凭证将通过 GitHub API 加密写入到仓库的 Actions Secrets",
        store: "GitHub → Settings → Secrets and variables → Actions",
        writable: missing.length === 0,
        missingConfig: missing,
      };
    }
    case "local":
    default: {
      return {
        env: "local",
        label: "本地开发",
        description: "凭证将写入到 .env 文件（已被 .gitignore 忽略，不会提交）",
        store: ".env (gitignored)",
        writable: true,
        missingConfig: [],
      };
    }
  }
}
