// GET /api/auth/check — check if ADMIN_SECRET is configured and if the current
// request is authenticated.
//
// Response: { configured: boolean, authenticated: boolean }
//
// Authentication model:
//   - If ADMIN_SECRET env var is empty/unset → open mode (configured=false, authenticated=true)
//   - If ADMIN_SECRET is set → protected mode (configured=true)
//     - Authenticated if the `affiliate_auth` cookie matches SHA-256(ADMIN_SECRET)
//
// Cookie format:
//   affiliate_auth = hex(SHA-256(ADMIN_SECRET + "affiliate-ai-hub-v1"))
//   (Deterministic — proves the user knew the secret. Not time-limited.)

export const runtime = "edge";

import { NextResponse } from "next/server";
import { computeAuthCookieValue } from "@/lib/auth";

export async function GET(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const configured = !!adminSecret;

  if (!configured) {
    // Open mode — no secret configured, everyone is "authenticated"
    return NextResponse.json({ configured: false, authenticated: true });
  }

  // Protected mode — check cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const expected = await computeAuthCookieValue(adminSecret!);
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
  const provided = cookies["affiliate_auth"];
  const authenticated = !!provided && provided === expected;

  return NextResponse.json({ configured: true, authenticated });
}
