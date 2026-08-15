// Authentication helpers for ADMIN_SECRET (admin) / DEMO_TOKEN (demo) login.
//
// Auth flow:
//   1. User visits any page → frontend calls GET /api/auth/check
//   2. If configured=true && authenticated=false → redirect to /login
//   3. User enters a token → POST /api/auth/login
//      - Matches ADMIN_SECRET          → role = "admin"
//      - Matches any DEMO_TOKEN (comma-separated) → role = "demo"
//   4. On success, server sets `affiliate_auth` cookie
//   5. Subsequent requests are authenticated via the cookie
//
// Cookie value:
//   "admin:" + hex(SHA-256(ADMIN_SECRET + salt))
//   "demo:"  + hex(SHA-256(<demo-token> + salt))
//   - Role prefix prevents collision between admin/demo secrets
//   - Backward compatible: a legacy cookie (no prefix) is treated as admin
//     if it matches hex(SHA-256(ADMIN_SECRET + salt))
//
// Security note:
//   This is a simple shared-secret auth for protecting an admin dashboard.
//   For high-security applications, use a proper session store with
//   per-session tokens, expiry, and rotation.

export const AUTH_COOKIE_NAME = "affiliate_auth";
const AUTH_COOKIE_SALT = "affiliate-ai-hub-v1";

export type AuthRole = "admin" | "demo";

export interface AuthState {
  configured: boolean;
  authenticated: boolean;
  role?: AuthRole;
}

/**
 * Compute the expected auth cookie value for a given token.
 * Returns hex(SHA-256(token + salt)).
 *
 * Uses Web Crypto API (edge-compatible).
 */
export async function computeAuthCookieValue(token: string): Promise<string> {
  const data = new TextEncoder().encode(token + AUTH_COOKIE_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parse comma-separated env var into a trimmed, non-empty array.
 * Used for DEMO_TOKEN (multiple demo tokens separated by ",").
 */
export function parseTokenList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return idx === -1 ? [c, ""] : [c.slice(0, idx), c.slice(idx + 1)];
      }),
  );
}

/**
 * Check if the current request is authenticated and which role it belongs to.
 */
export async function isAuthenticated(request: Request): Promise<AuthState> {
  const adminSecret = process.env.ADMIN_SECRET;
  const demoTokens = parseTokenList(process.env.DEMO_TOKEN);

  const hasAdmin = !!adminSecret;
  const hasDemo = demoTokens.length > 0;

  if (!hasAdmin && !hasDemo) {
    // No auth configured → treat as authenticated admin (dev/open mode)
    return { configured: false, authenticated: true, role: "admin" };
  }

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const provided = cookies[AUTH_COOKIE_NAME];
  if (!provided) {
    return { configured: true, authenticated: false };
  }

  // Role-prefixed cookie: "admin:<hash>" | "demo:<hash>"
  if (provided.startsWith("admin:")) {
    const expected = await computeAuthCookieValue(adminSecret ?? "");
    if (provided === `admin:${expected}`) {
      return { configured: true, authenticated: true, role: "admin" };
    }
  } else if (provided.startsWith("demo:")) {
    const hash = provided.slice("demo:".length);
    for (const t of demoTokens) {
      if (hash === (await computeAuthCookieValue(t))) {
        return { configured: true, authenticated: true, role: "demo" };
      }
    }
  } else {
    // Legacy cookie (no prefix) — treat as admin
    const expected = await computeAuthCookieValue(adminSecret ?? "");
    if (provided === expected) {
      return { configured: true, authenticated: true, role: "admin" };
    }
  }

  return { configured: true, authenticated: false };
}

/**
 * Validate a submitted login token and return its role, or null if invalid.
 */
export async function validateLoginToken(
  token: string,
): Promise<{ role: AuthRole } | null> {
  const trimmed = token?.trim();
  if (!trimmed) return null;

  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && trimmed === adminSecret) {
    return { role: "admin" };
  }

  const demoTokens = parseTokenList(process.env.DEMO_TOKEN);
  if (demoTokens.includes(trimmed)) {
    return { role: "demo" };
  }

  return null;
}
