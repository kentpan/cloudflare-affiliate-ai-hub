// Authentication helpers for ADMIN_SECRET-based login.
//
// Auth flow:
//   1. User visits any page → frontend calls GET /api/auth/check
//   2. If configured=true && authenticated=false → redirect to /login
//   3. User enters ADMIN_SECRET → POST /api/auth/login
//   4. On success, server sets `affiliate_auth` cookie
//   5. Subsequent requests are authenticated via the cookie
//
// Cookie value:
//   hex(SHA-256(ADMIN_SECRET + AUTH_COOKIE_SALT))
//   - Deterministic: same ADMIN_SECRET → same cookie value
//   - Not time-limited (cookie has 30-day Max-Age for UX)
//   - httpOnly: JavaScript cannot read the cookie
//   - SameSite=Lax: protects against CSRF for top-level navigations
//
// Security note:
//   This is a simple shared-secret auth for protecting an admin dashboard.
//   For high-security applications, use a proper session store with
//   per-session tokens, expiry, and rotation.

export const AUTH_COOKIE_NAME = "affiliate_auth";
const AUTH_COOKIE_SALT = "affiliate-ai-hub-v1";

/**
 * Compute the expected auth cookie value for a given ADMIN_SECRET.
 * Returns hex(SHA-256(secret + salt)).
 *
 * Uses Web Crypto API (edge-compatible).
 */
export async function computeAuthCookieValue(adminSecret: string): Promise<string> {
  const data = new TextEncoder().encode(adminSecret + AUTH_COOKIE_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if the current request is authenticated.
 * Used by server-side code that has access to the request.
 */
export async function isAuthenticated(request: Request): Promise<{
  configured: boolean;
  authenticated: boolean;
}> {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return { configured: false, authenticated: true };
  }
  const cookieHeader = request.headers.get("cookie") || "";
  const expected = await computeAuthCookieValue(adminSecret);
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return idx === -1 ? [c, ""] : [c.slice(0, idx), c.slice(idx + 1)];
      }),
  );
  const provided = cookies[AUTH_COOKIE_NAME];
  return { configured: true, authenticated: !!provided && provided === expected };
}
